// Upload dua tahap dan penyajian file (PRD §6.1, §6.3).
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { and, eq, lt } from 'drizzle-orm';
import { AppError, canDraw, type Identity } from '@plant/contracts';
import { getDrawingsDb } from './database';
import { files, audit } from './schema';
import { IMAGE_MAX_BYTES, STAGED_TTL_MS, maxPdfBytes } from './config';
import { detectImage } from './pdf';
import { processPdf } from './pdf-compress';
import { processImage, webpName, withImageSlot, type ProcessedFile } from './images';
import { storageKey, thumbKey, withStorage, type ByteRange, type Storage } from './storage';

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
type StoredFile = Pick<
  FileRow,
  'storageKey' | 'size' | 'sha256' | 'mime' | 'thumbStorageKey' | 'thumbSize' | 'thumbSha256'
>;

/** Objek storage milik satu baris file: file penuh, lalu thumbnail bila ada. */
export function fileObjects(row: StoredFile) {
  const objects = [{ key: row.storageKey, size: row.size, sha256: row.sha256, mime: row.mime }];
  if (row.thumbStorageKey && row.thumbSize !== null && row.thumbSha256)
    objects.push({
      key: row.thumbStorageKey,
      size: row.thumbSize,
      sha256: row.thumbSha256,
      mime: 'image/webp',
    });
  return objects;
}

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
  options?: { compress?: boolean },
): Promise<StagedFile> {
  try {
    let mime: string,
      stored: ProcessedFile = body,
      thumb: ProcessedFile | null = null,
      converted: boolean | undefined,
      compressed: boolean | undefined,
      pageCount: number | null = null;
    if (kind === 'pdf') {
      if (body.head.subarray(0, 5).toString('latin1') !== '%PDF-')
        throw new AppError(422, 'File bukan PDF.', 'FILE_INVALID');
      const processed = await processPdf(body, { compress: options?.compress });
      stored = processed.file;
      pageCount = processed.pageCount;
      compressed = processed.compressed;
      mime = 'application/pdf';
    } else {
      const image = detectImage(body.head);
      if (!image || image.mime !== declaredType)
        throw new AppError(422, 'Gambar harus JPEG, PNG atau WebP yang valid.', 'FILE_INVALID');
      const processed = await withImageSlot(() => processImage(body));
      ({ full: stored, thumb, converted } = processed);
      mime = 'image/webp';
      name = webpName(name);
    }
    const id = randomUUID(),
      now = new Date(),
      row = {
        storageKey: storageKey(id, kind === 'pdf' ? 'pdf' : 'webp', now),
        size: stored.size,
        sha256: stored.sha256,
        mime,
        thumbStorageKey: thumb ? thumbKey(id, now) : null,
        thumbSize: thumb?.size ?? null,
        thumbSha256: thumb?.sha256 ?? null,
      };
    const objects = fileObjects(row);
    const removeObjects = () =>
      Promise.all(objects.map((o) => withStorage((s) => s.delete(o.key)).catch(() => undefined)));
    try {
      for (const [index, o] of objects.entries())
        await withStorage((s) =>
          s.put(o.key, index === 0 ? stored.path : thumb!.path, {
            size: o.size,
            contentType: o.mime,
            sha256: o.sha256,
          }),
        );
    } catch (e) {
      await removeObjects();
      throw e;
    }
    try {
      await getDrawingsDb().transaction(async (tx) => {
        await tx.insert(files).values({
          id,
          kind,
          ...row,
          originalName: name,
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
          details: JSON.stringify({
            kind,
            name,
            size: stored.size,
            sha256: stored.sha256,
            pageCount,
            ...(kind === 'pdf' && { compressed, uploadedSize: body.size }),
            ...(kind === 'image' && { converted, uploadedSize: body.size }),
          }),
          createdAt: now,
        });
      });
    } catch (e) {
      await removeObjects();
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
      size: stored.size,
      sha256: stored.sha256,
      pageCount,
      mime,
      status: 'staged',
    };
  } finally {
    await Promise.all(
      [
        body.path,
        body.path + '.webp',
        body.path + '.thumb.webp',
        body.path + '.reimg.pdf',
        body.path + '.qpdf.pdf',
      ].map((path) => rm(path, { force: true })),
    );
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
    .select()
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
    for (const o of fileObjects(row)) await withStorage((s) => s.delete(o.key));
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
 * `cache: 'revalidate'` (PDF & gambar) mengizinkan browser menyimpan salinan pribadi yang selalu
 * divalidasi ulang: ETag cocok (non-range) → 304 tanpa membaca storage. Izin diperiksa pemanggil lebih dulu.
 */
export async function serveFile(
  request: Request,
  file: Pick<FileRow, 'storageKey' | 'size' | 'sha256' | 'mime'>,
  {
    disposition = 'inline',
    name,
    storage,
    cache = 'no-store',
  }: {
    disposition?: 'inline' | 'attachment';
    name: string;
    storage?: Storage;
    cache?: 'no-store' | 'revalidate';
  },
) {
  const etag = `"${file.sha256}"`,
    cacheControl =
      cache === 'revalidate' ? 'private, no-cache, no-transform' : 'private, no-store, no-transform';
  if (
    cache === 'revalidate' &&
    !request.headers.has('range') &&
    matchesEtag(request.headers.get('if-none-match'), etag)
  )
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': cacheControl } });
  const range = parseRange(request.headers.get('range'), file.size);
  const common = {
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Cache-Control': cacheControl,
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

function matchesEtag(header: string | null, etag: string) {
  return !!header && header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag);
}

/** Gambar lampiran: thumbnail bila diminta dan tersedia (gambar lama tanpa thumbnail → file penuh). */
export function serveImage(
  request: Request,
  file: StoredFile,
  { name, variant, storage }: { name: string; variant: 'full' | 'thumb'; storage?: Storage },
) {
  const [full, thumb] = fileObjects(file);
  const chosen = variant === 'thumb' && thumb ? thumb : full;
  return serveFile(
    request,
    { storageKey: chosen.key, size: chosen.size, sha256: chosen.sha256, mime: chosen.mime },
    { name, storage, disposition: 'inline', cache: 'revalidate' },
  );
}
