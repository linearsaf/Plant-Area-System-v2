// Copy Drawing Database files from the fs driver to S3-compatible storage (PRD §6.2, K4).
// Usage: pnpm drawings:storage-copy [--dry-run]
//   Source: DRAWINGS_STORAGE_PATH (fs). Target: DRAWINGS_S3_* (regardless of DRAWINGS_STORAGE_DRIVER).
// Copies every non-orphaned drawing_files row (file and thumbnail), verifies SHA-256 by reading the target back, and is
// safe to repeat: objects already present with the same size and hash are skipped. Read-only on the
// database. After a clean run, switch DRAWINGS_STORAGE_DRIVER=s3 and restart the drawings service.
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  FsStorage,
  S3Storage,
  closeDrawingsDb,
  drawingsSchema,
  fileObjects,
  getDrawingsDb,
  storageConfig,
} from '@plant/drawings-core';

const dryRun = process.argv.includes('--dry-run');
const sha256 = async (body: ReadableStream<Uint8Array>) => {
  const hash = createHash('sha256');
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) hash.update(chunk);
  return hash.digest('hex');
};
const summary = {
  event: 'drawings.storage_copy',
  dryRun,
  total: 0,
  copied: 0,
  skipped: 0,
  failed: [] as string[],
};
try {
  const path = process.env.DRAWINGS_STORAGE_PATH?.trim();
  if (!path) throw Error('DRAWINGS_STORAGE_PATH (sumber fs) diperlukan.');
  const target = storageConfig({ ...process.env, DRAWINGS_STORAGE_DRIVER: 's3' });
  if (target.driver !== 's3') throw Error('Target harus s3.');
  const source = new FsStorage(path),
    destination = new S3Storage(target);
  const rows = await getDrawingsDb().select().from(drawingsSchema.files);
  for (const row of rows) {
    if (row.status === 'orphaned') continue;
    for (const [index, o] of fileObjects(row).entries()) {
      const label = index === 0 ? row.id : `${row.id}:thumb`;
      summary.total++;
      try {
        const existing = await destination.head(o.key);
        if (
          existing &&
          existing.size === o.size &&
          (await sha256((await destination.get(o.key)).body)) === o.sha256
        ) {
          summary.skipped++;
          continue;
        }
        if (existing) throw Error('Objek target ada tetapi berbeda; tidak ditimpa.');
        const local = await source.head(o.key);
        if (!local || local.size !== o.size) throw Error('Objek sumber hilang atau ukurannya berbeda.');
        if ((await sha256((await source.get(o.key)).body)) !== o.sha256) throw Error('Hash sumber berbeda.');
        if (dryRun) {
          summary.copied++;
          continue;
        }
        await destination.put(o.key, join(path, o.key), {
          size: o.size,
          contentType: o.mime,
          sha256: o.sha256,
        });
        if ((await sha256((await destination.get(o.key)).body)) !== o.sha256)
          throw Error('Verifikasi hash target gagal.');
        summary.copied++;
      } catch (e) {
        summary.failed.push(`${label}: ${e instanceof Error ? e.message : 'gagal'}`);
      }
    }
  }
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed.length) process.exitCode = 1;
} catch (e) {
  console.error(
    JSON.stringify({
      event: 'drawings.storage_copy_failed',
      message: e instanceof Error ? e.message : 'Penyalinan gagal.',
    }),
  );
  process.exitCode = 1;
} finally {
  await closeDrawingsDb();
}
