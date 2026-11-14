// Upload dua tahap dan penyajian file (PRD §6.1, §6.3).
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { and, eq, lt } from 'drizzle-orm';
import { AppError, canDraw, type Identity } from '@plant/contracts';
import { getDrawingsDb } from './database';
import { files, audit } from './schema';
import { IMAGE_MAX_BYTES, STAGED_TTL_MS, maxPdfBytes } from './config';
import { detectImage, validatePdf } from './pdf';
import { storageKey, withStorage, type ByteRange, type Storage } from './storage';

export type UploadKind = 'pdf' | 'image';
export type StagedFile = {
  fileId: string;
  kind: UploadKind;
  name: string;
  size: number;
  sha256: string;
  pageCount: number | null;
  mime: string;
  status: 'staged';
};
export type FileRow = typeof files.$inferSelect;
type Body = { path: string; size: number; sha256: string; head: Buffer };

export function uploadLimit(kind: UploadKind) {
  return kind === 'pdf' ? maxPdfBytes() : IMAGE_MAX_BYTES;
}

/** PDF untuk drawing/legacy; gambar untuk request dan lampiran keputusan reject. */
export function requireUpload(actor: Identity, kind: string): UploadKind {
  if (kind !== 'pdf' && kind !== 'image') throw new AppError(400, 'Parameter kind harus pdf atau image.');
  const allowed =
    kind === 'pdf'
      ? canDraw(actor, 'drawing.create') ||
        canDraw(actor, 'drawing.edit_submit') ||
        canDraw(actor, 'drawing.legacy_upload')
      : canDraw(actor, 'request.create') ||
        canDraw(actor, 'revision.check') ||
        canDraw(actor, 'revision.approve_l1') ||
        canDraw(actor, 'revision.approve_l2');
  if (!allowed) throw new AppError(403, 'Anda tidak dapat mengunggah file jenis ini.');
  return kind;
}

/** Nama file dari header `X-File-Name` (percent-encoded); hanya basename, tanpa karakter kontrol. */
export function fileNameFromHeader(value: string | null, kind: UploadKind) {
  let name = '';
  try {
    name = decodeURIComponent(value ?? '');
  } catch {
    throw new AppError(400, 'X-File-Name tidak valid.');
  }
  name = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '')
    .trim();
  if (!name) throw new AppError(400, 'X-File-Name diperlukan.');
  if (kind === 'pdf' && !/\.pdf$/i.test(name)) name += '.pdf';
  if (name.length > 200) {
    const extension = /\.[A-Za-z0-9]{1,8}$/.exec(name)?.[0] ?? '';
    name = name.slice(0, 200 - extension.length) + extension;
  }
  return name;
}

const PDF_TYPES = ['application/pdf'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function requireContentType(kind: UploadKind, header: string | null) {
  const type = header?.split(';')[0].trim().toLowerCase() ?? '';
  if (!(kind === 'pdf' ? PDF_TYPES : IMAGE_TYPES).includes(type))
    throw new AppError(
      415,
      kind === 'pdf' ? 'File harus PDF.' : 'Gambar harus JPEG, PNG atau WebP. SVG tidak diterima.',
      'FILE_INVALID',
    );
  return type;
}

let lastCleanup = 0;
/**
 * Menyimpan body yang sudah dialirkan ke file sementara sebagai file `staged` milik actor.
 * Urutan: validasi → simpan ke storage → catat database. Gagal mencatat → objek dibersihkan.
 */
export async function stageUpload(
  actor: Identity,
  kind: UploadKind,
  name: string,
  declaredType: string,
  body: Body,
): Promise<StagedFile> {
  try {
    let mime: string,
      extension: 'pdf' | 'jpg' | 'png' | 'webp',
      pageCount: number | null = null;
    if (kind === 'pdf') {
      if (body.head.subarray(0, 5).toString('latin1') !== '%PDF-')
        throw new AppError(422, 'File bukan PDF.', 'FILE_INVALID');
      ({ pageCount } = await validatePdf(body.path));
      mime = 'application/pdf';
      extension = 'pdf';
    } else {
      const image = detectImage(body.head);
      if (!image || image.mime !== declaredType)
        throw new AppError(422, 'Gambar harus JPEG, PNG atau WebP yang valid.', 'FILE_INVALID');
      ({ mime, extension } = image);
    }
    const id = randomUUID(),
      now = new Date(),
      key = storageKey(id, extension, now);
    await withStorage((s) =>
      s.put(key, body.path, { size: body.size, contentType: mime, sha256: body.sha256 }),
    );
    try {
      await getDrawingsDb().transaction(async (tx) => {
        await tx.insert(files).values({
          id,
          kind,
          storageKey: key,
          originalName: name,
          mime,
          size: body.size,
          sha256: body.sha256,
          pageCount,
          status: 'staged',
          ownerId: actor.id,
          ownerName: actor.name,
          createdAt: now,
        });
        await tx.insert(audit).values({
          id: randomUUID(),
          actorId: actor.id,
          actorName: actor.name,
          action: 'file.staged',
          targetType: 'file',
          targetId: id,
          details: JSON.stringify({ kind, name, size: body.size, sha256: body.sha256, pageCount }),
          createdAt: now,
        });
      });
    } catch (e) {
      await withStorage((s) => s.delete(key)).catch(() => undefined);
      throw e;
    }
    if (Date.now() - lastCleanup > 3_600_000) {
      lastCleanup = Date.now();
      void cleanupStagedFiles().catch(() => undefined);
    }
    return {
      fileId: id,
      kind,
      name,
      size: body.size,
      sha256: body.sha256,
      pageCount,
      mime,
      status: 'staged',
    };
  } finally {
    await rm(body.path, { force: true });
  }
}

/** File staged milik actor (pratinjau sebelum dirujuk drawing). */
export async function stagedFileForOwner(actor: Identity, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError(404, 'File tidak ditemukan.');
  const [row] = await getDrawingsDb().select().from(files).where(eq(files.id, id));
  if (!row || row.ownerId !== actor.id || row.status !== 'staged')
    throw new AppError(404, 'File tidak ditemukan.');
  return row;
}

/**
 * Membersihkan file staged yang tidak dipakai dalam 24 jam: status diklaim `orphaned` lebih dulu
 * (atomik), lalu objek storage dihapus di luar transaksi.
 */
export async function cleanupStagedFiles(now = Date.now(), limit = 50) {
  const db = getDrawingsDb();
  const stale = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.status, 'staged'), lt(files.createdAt, new Date(now - STAGED_TTL_MS))))
    .limit(limit);
  let removed = 0;
  for (const row of stale) {
    const [result] = await db
      .update(files)
      .set({ status: 'orphaned', orphanedAt: new Date(now) })
      .where(and(eq(files.id, row.id), eq(files.status, 'staged')));
    if (!result.affectedRows) continue;
    await withStorage((s) => s.delete(row.storageKey));
    removed++;
  }
  return removed;
}

/**
 * Menafsirkan header Range tunggal `bytes=a-b`, `bytes=a-` atau `bytes=-n`.
 * `null` = sajikan seluruh file; `'invalid'` = 416. Banyak rentang diabaikan (seluruh file).
 */
export function parseRange(header: string | null, size: number): ByteRange | null | 'invalid' {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return header.trim().startsWith('bytes=') && header.includes(',') ? null : 'invalid';
  const [, a, b] = match;
  if (!a && !b) return 'invalid';
  if (!a) {
    const suffix = Number(b);
    if (suffix === 0 || size === 0) return 'invalid';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(a),
    end = b ? Math.min(Number(b), size - 1) : size - 1;
  if (start >= size || (b && Number(b) < start)) return 'invalid';
  return { start, end };
}

/** Nama unduhan aman untuk header Content-Disposition (ASCII + RFC 5987). */
export function contentDisposition(type: 'inline' | 'attachment', name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Mengalirkan file dari storage tanpa memuat seluruh isi ke memori; mendukung Range.
 * `no-transform` mencegah kompresi otomatis yang merusak range request.
 */
export async function serveFile(
  request: Request,
  file: Pick<FileRow, 'storageKey' | 'size' | 'sha256' | 'mime'>,
  {
    disposition = 'inline',
    name,
    storage,
  }: { disposition?: 'inline' | 'attachment'; name: string; storage?: Storage },
) {
  const range = parseRange(request.headers.get('range'), file.size);
  const common = {
    'Accept-Ranges': 'bytes',
    ETag: `"${file.sha256}"`,
    'Cache-Control': 'private, no-store, no-transform',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': file.mime,
    'Content-Disposition': contentDisposition(disposition, name),
  };
  if (range === 'invalid')
    return new Response(null, {
      status: 416,
      headers: { ...common, 'Content-Range': `bytes */${file.size}` },
    });
  const object = await withStorage((s) => s.get(file.storageKey, range ?? undefined), storage);
  if (object.size !== file.size) {
    await object.body.cancel().catch(() => undefined);
    throw new AppError(503, 'File di storage tidak sesuai catatan.', 'STORAGE_UNAVAILABLE');
  }
  if (!range)
    return new Response(object.body, {
      status: 200,
      headers: { ...common, 'Content-Length': String(file.size) },
    });
  return new Response(object.body, {
    status: 206,
    headers: {
      ...common,
      'Content-Length': String(range.end - range.start + 1),
      'Content-Range': `bytes ${range.start}-${range.end}/${file.size}`,
    },
  });
}
