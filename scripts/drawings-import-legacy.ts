// Bulk import of archive drawings as Legacy Ready (PRD §4.5), one drawing per manifest row.
// Usage: pnpm drawings:import-legacy --dir <folder> --uploader-id <id> --uploader-name <name>
//          [--uploader-role admin|leader] [--dry-run] [--offline] [--no-compress] [--limit N] [--only a,b] [--report <file>]
//   <folder> holds manifest.csv, conversion.csv and pdf/<number>.pdf (prepared outside the repository).
//   The uploader must be an existing Admin or Draft Leader account; it becomes owner and Uploaded by,
//   while Drawn by is taken from the manifest (the original author is not a system user).
// Every row goes through the same validation, storage, audit and Legacy Ready rules as the
// Upload Old Drawing form (stageUpload + createLegacyDrawing). Safe to repeat: a drawing whose
// number already exists is skipped; a voided number can be imported again.
//   --dry-run   validates rows, files and hashes, then reads the database; writes nothing.
//   --offline   with --dry-run: skips the database checks (no database connection needed).
// Company data stays outside the repository; the report is written next to the manifest.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdtemp, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError, canDraw, type Identity } from '@plant/contracts';
import {
  closeDrawingsDb,
  createLegacyDrawing,
  drawingsSchema,
  getDrawingsDb,
  legacyImportKey,
  legacyImportRow,
  parseCsv,
  stageUpload,
  type LegacyImportRow,
} from '@plant/drawings-core';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
type Result = 'imported' | 'would_import' | 'skipped_existing' | 'failed';
const report: { number: string; result: Result; drawingId: string; detail: string }[] = [];
const note = (number: string, result: Result, detail = '', drawingId = '') =>
  report.push({ number, result, drawingId, detail });
const message = (e: unknown) => (e instanceof Error ? e.message : 'gagal');

async function sha256(path: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

const dryRun = flag('dry-run'),
  offline = flag('offline'),
  compress = !flag('no-compress');
let connected = false,
  fatal = '';
const started = Date.now();
try {
  const dir = option('dir');
  if (!dir) throw Error('--dir <folder manifest> diperlukan.');
  if (offline && !dryRun) throw Error('--offline hanya berlaku bersama --dry-run.');
  const root = resolve(dir);
  const limit = option('limit') ? Number(option('limit')) : Infinity;
  if (!(limit > 0)) throw Error('--limit harus bilangan positif.');
  const only = option('only')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // 1. Manifest: field rules, one row per number.
  const conversion = new Map(
    parseCsv(await readFile(join(root, 'conversion.csv'), 'utf8')).map((r) => [r.number, r]),
  );
  let source = parseCsv(await readFile(join(root, 'manifest.csv'), 'utf8'));
  if (only) source = source.filter((r) => only.includes(r.number));
  source = source.slice(0, limit);
  if (!source.length) throw Error('Tidak ada baris manifest yang dipilih.');
  const seen = new Set<string>();
  let rows: LegacyImportRow[] = [];
  for (const raw of source) {
    const outcome = legacyImportRow(raw, conversion.get(raw.number));
    if (!outcome.ok) {
      note(outcome.number, 'failed', outcome.error);
      continue;
    }
    const key = outcome.row.number.toUpperCase();
    if (seen.has(key)) {
      note(outcome.row.number, 'failed', 'Drawing Number ganda di manifest.');
      continue;
    }
    seen.add(key);
    rows.push(outcome.row);
  }

  // 2. Files: present, same size and SHA-256 as recorded by the conversion.
  const verified: LegacyImportRow[] = [];
  for (const row of rows) {
    try {
      const path = join(root, row.outputPdf);
      if ((await stat(path)).size !== row.size) throw Error('Ukuran PDF berbeda dari conversion.csv.');
      if ((await sha256(path)) !== row.sha256) throw Error('SHA-256 PDF berbeda dari conversion.csv.');
      verified.push(row);
    } catch (e) {
      const missing = (e as NodeJS.ErrnoException).code === 'ENOENT';
      note(row.number, 'failed', missing ? 'File PDF tidak ditemukan.' : message(e));
    }
  }
  rows = verified;

  if (offline)
    for (const row of rows) note(row.number, 'would_import', 'Database tidak diperiksa (--offline).');
  else {
    // 3. Uploader and masters.
    const id = option('uploader-id') ?? '',
      name = option('uploader-name')?.trim() ?? '',
      role = option('uploader-role') ?? 'admin';
    if (!/^[0-9a-f-]{36}$/.test(id)) throw Error('--uploader-id harus ID akun pengunggah.');
    if (!name || name.length > 100) throw Error('--uploader-name harus 1–100 karakter.');
    if (role !== 'admin' && role !== 'leader') throw Error('--uploader-role harus admin atau leader.');
    const actor: Identity = {
      id,
      name,
      email: '',
      position: '',
      portalAdmin: false,
      mustChangePassword: false,
      grants: [{ appId: 'drawings', role }],
    };
    if (!canDraw(actor, 'drawing.legacy_upload'))
      throw Error('Pengunggah tidak dapat mengunggah Old Drawing.');
    const db = getDrawingsDb();
    connected = true;
    const masters = await db.select().from(drawingsSchema.disciplines);
    const discipline = new Map(masters.filter((m) => m.active).map((m) => [m.name.toLowerCase(), m.id]));
    const missing = [...new Set(rows.map((r) => r.discipline))].filter(
      (d) => !discipline.has(d.toLowerCase()),
    );
    if (missing.length) throw Error(`Discipline belum ada atau nonaktif di master: ${missing.join(', ')}.`);

    // 4. Numbers already used by an active drawing are skipped, which makes a rerun resume.
    const existing = new Map<string, { id: string; source: string }>();
    for (let i = 0; i < rows.length; i += 500) {
      const numbers = rows.slice(i, i + 500).map((r) => r.number);
      const found = await db
        .select({
          id: drawingsSchema.drawings.id,
          number: drawingsSchema.drawings.number,
          source: drawingsSchema.drawings.source,
        })
        .from(drawingsSchema.drawings)
        .where(
          and(inArray(drawingsSchema.drawings.number, numbers), isNull(drawingsSchema.drawings.voidedAt)),
        );
      for (const d of found) if (d.number) existing.set(d.number.toUpperCase(), d);
    }

    const work = dryRun ? null : await mkdtemp(join(tmpdir(), 'legacy-import-'));
    try {
      for (const [n, row] of rows.entries()) {
        const taken = existing.get(row.number.toUpperCase());
        if (taken) {
          const detail = taken.source === 'legacy' ? 'Sudah diimpor.' : 'Nomor dipakai drawing non-legacy.';
          note(row.number, 'skipped_existing', detail, taken.id);
          continue;
        }
        if (!work) {
          note(row.number, 'would_import');
          continue;
        }
        try {
          // stageUpload consumes (deletes) the file it is given, so it works on a private copy.
          const copy = join(work, 'upload.pdf');
          await copyFile(join(root, row.outputPdf), copy);
          const handle = await open(copy, 'r');
          const head = Buffer.alloc(16);
          await handle.read(head, 0, 16, 0);
          await handle.close();
          const staged = await stageUpload(
            actor,
            'pdf',
            `${row.number}.pdf`,
            'application/pdf',
            {
              path: copy,
              size: row.size,
              sha256: row.sha256,
              head,
            },
            { compress },
          );
          if (staged.pageCount !== row.pageCount)
            throw Error(`Jumlah halaman ${staged.pageCount} berbeda dari manifest ${row.pageCount}.`);
          const created = await createLegacyDrawing(
            actor,
            {
              number: row.number,
              title: row.title,
              hac: row.hac,
              otherHacs: row.otherHacs,
              disciplineId: discipline.get(row.discipline.toLowerCase()),
              description: row.description,
              revisionNo: row.revisionNo,
              ownerId: actor.id,
              legacyNote: row.legacyNote,
              fileId: staged.fileId,
            },
            legacyImportKey(row.number, staged.fileId),
            async () => [],
            { drawnByName: row.drawnBy },
          );
          note(row.number, 'imported', '', (created.body as { id: string }).id);
        } catch (e) {
          if (e instanceof AppError && e.code === 'DUPLICATE_NUMBER')
            note(row.number, 'skipped_existing', 'Nomor dipakai drawing lain.');
          else note(row.number, 'failed', message(e));
          // Storage or database outage: stop instead of failing every remaining row.
          if (e instanceof AppError && e.status === 503) {
            fatal = 'Penyimpanan tidak tersedia; impor dihentikan. Jalankan ulang untuk melanjutkan.';
            break;
          }
        }
        if ((n + 1) % 100 === 0)
          console.error(
            JSON.stringify({ event: 'drawings.legacy_import_progress', done: n + 1, of: rows.length }),
          );
      }
    } finally {
      if (work) await rm(work, { recursive: true, force: true });
    }
  }

  // 5. Report next to the manifest, summary on stdout.
  const target = option('report') ?? join(root, dryRun ? 'import-dry-run.csv' : 'import-report.csv');
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = report.map((r) => [r.number, r.result, r.drawingId, r.detail].map(cell).join(','));
  await writeFile(target, '﻿' + ['number,result,drawing_id,detail', ...lines].join('\n') + '\n');
  const count = (result: Result) => report.filter((r) => r.result === result).length;
  const failed = report.filter((r) => r.result === 'failed');
  console.log(
    JSON.stringify(
      {
        event: 'drawings.legacy_import',
        dryRun,
        offline,
        compress,
        selected: source.length,
        imported: count('imported'),
        wouldImport: count('would_import'),
        skippedExisting: count('skipped_existing'),
        failed: failed.length,
        failures: failed.slice(0, 20).map((r) => `${r.number}: ${r.detail}`),
        stopped: fatal || undefined,
        report: target,
        seconds: Math.round((Date.now() - started) / 1000),
      },
      null,
      2,
    ),
  );
  if (failed.length || fatal) process.exitCode = 1;
} catch (e) {
  console.error(JSON.stringify({ event: 'drawings.legacy_import_failed', message: message(e) }));
  process.exitCode = 1;
} finally {
  if (connected) await closeDrawingsDb();
}
