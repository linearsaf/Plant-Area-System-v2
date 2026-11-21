// Read-only reconciliation of drawing_files against object storage (PRD §6.2).
// Usage: pnpm drawings:reconcile [--hash]
//   Checks every attached/staged row (file and thumbnail): object exists and size matches; with --hash
//   also SHA-256. Thumbnail objects are reported as `<id>:thumb`.
//   Lists storage objects without a database row (unknown) and orphaned rows whose object remains.
// Never writes to the database or storage. Exit code 1 when a referenced object is missing or differs.
import { createHash } from 'node:crypto';
import {
  closeDrawingsDb,
  createStorage,
  drawingsSchema,
  fileObjects,
  getDrawingsDb,
} from '@plant/drawings-core';

const withHash = process.argv.includes('--hash');
const storage = createStorage();
const report = {
  event: 'drawings.reconcile',
  driver: storage.driver,
  hashChecked: withHash,
  rows: 0,
  ok: 0,
  missing: [] as string[],
  sizeMismatch: [] as string[],
  hashMismatch: [] as string[],
  orphanedObjectsRemaining: [] as string[],
  unknownObjects: [] as string[],
};
try {
  const rows = await getDrawingsDb().select().from(drawingsSchema.files);
  const byKey = new Map(rows.flatMap((r) => fileObjects(r).map((o) => [o.key, r] as const)));
  for (const row of rows) {
    if (row.status === 'orphaned') continue;
    report.rows++;
    let ok = true;
    for (const [index, expected] of fileObjects(row).entries()) {
      const label = index === 0 ? row.id : `${row.id}:thumb`;
      const head = await storage.head(expected.key);
      if (!head) {
        report.missing.push(label);
        ok = false;
        continue;
      }
      if (head.size !== expected.size) {
        report.sizeMismatch.push(label);
        ok = false;
        continue;
      }
      if (withHash) {
        const object = await storage.get(expected.key);
        const hash = createHash('sha256');
        for await (const chunk of object.body as unknown as AsyncIterable<Uint8Array>) hash.update(chunk);
        if (hash.digest('hex') !== expected.sha256) {
          report.hashMismatch.push(label);
          ok = false;
        }
      }
    }
    if (ok) report.ok++;
  }
  for await (const object of storage.list()) {
    const row = byKey.get(object.key);
    if (!row) report.unknownObjects.push(object.key);
    else if (row.status === 'orphaned') report.orphanedObjectsRemaining.push(row.id);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.missing.length || report.sizeMismatch.length || report.hashMismatch.length) process.exitCode = 1;
} catch (e) {
  console.error(
    JSON.stringify({
      event: 'drawings.reconcile_failed',
      errorType: e instanceof Error ? e.name : 'unknown',
      message: 'Periksa DRAWINGS_DATABASE_URL dan konfigurasi storage; detail koneksi tidak dicatat.',
    }),
  );
  process.exitCode = 1;
} finally {
  await closeDrawingsDb();
}
