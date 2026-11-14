import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { CreateBucketCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  S3Storage,
  cleanupStagedFiles,
  closeDrawingsDb,
  drawingsSchema,
  getDrawingsDb,
  serveFile,
  stageUpload,
  stagedFileForOwner,
  storageKey,
} from '@plant/drawings-core';
import { AppError, type Identity } from '@plant/contracts';
if (
  process.env.TEST_DATABASE !== '1' ||
  !process.env.DRAWINGS_DATABASE_URL?.includes('127.0.0.1:13306/plant_drawings')
)
  throw Error('Isolated database required.');

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'drawings-int-'));
  process.env.DRAWINGS_STORAGE_DRIVER = 'fs';
  process.env.DRAWINGS_STORAGE_PATH = join(dir, 'store');
});
after(async () => {
  await closeDrawingsDb();
  await rm(dir, { recursive: true, force: true });
});
const person = (role: 'drafter' | 'viewer'): Identity => ({
  id: randomUUID(),
  name: 'Fixture ' + role,
  email: role + '@example.test',
  position: '',
  portalAdmin: false,
  mustChangePassword: false,
  grants: [{ appId: 'drawings', role }],
});
async function body(bytes: Uint8Array) {
  const path = join(dir, randomUUID());
  await writeFile(path, bytes);
  return {
    path,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    head: Buffer.from(bytes.subarray(0, 64)),
  };
}
async function samplePdf(pages = 2) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([841.89, 595.28]);
  return doc.save();
}

test('staged PDF is stored, audited, previewable by its owner only, and removes the temp file', async () => {
  const owner = person('drafter'),
    other = person('drafter');
  const bytes = await samplePdf(3);
  const input = await body(bytes);
  const staged = await stageUpload(owner, 'pdf', 'DWG-001.pdf', 'application/pdf', input);
  assert.equal(staged.pageCount, 3);
  assert.equal(staged.status, 'staged');
  await assert.rejects(access(input.path));
  const [row] = await getDrawingsDb()
    .select()
    .from(drawingsSchema.files)
    .where(eq(drawingsSchema.files.id, staged.fileId));
  assert.equal(row.ownerId, owner.id);
  assert.match(row.storageKey, /^files\/\d{4}\/[0-9a-f-]{36}\.pdf$/);
  const events = await getDrawingsDb()
    .select()
    .from(drawingsSchema.audit)
    .where(eq(drawingsSchema.audit.targetId, staged.fileId));
  assert.deepEqual(
    events.map((e) => e.action),
    ['file.staged'],
  );
  const file = await stagedFileForOwner(owner, staged.fileId);
  const response = await serveFile(new Request('https://x/', { headers: { range: 'bytes=0-4' } }), file, {
    name: file.originalName,
  });
  assert.equal(response.status, 206);
  assert.equal(await response.text(), '%PDF-');
  await assert.rejects(
    stagedFileForOwner(other, staged.fileId),
    (e) => e instanceof AppError && e.status === 404,
  );
});

test('invalid uploads are rejected without database rows or stored objects', async () => {
  const owner = person('drafter');
  const before = (await getDrawingsDb().select().from(drawingsSchema.files)).length;
  await assert.rejects(
    stageUpload(owner, 'pdf', 'fake.pdf', 'application/pdf', await body(Buffer.from('<svg/>'))),
    (e) => e instanceof AppError && e.code === 'FILE_INVALID',
  );
  await assert.rejects(
    stageUpload(owner, 'image', 'x.png', 'image/png', await body(Buffer.from('<svg xmlns="x"/>'))),
    (e) => e instanceof AppError && e.code === 'FILE_INVALID',
  );
  assert.equal((await getDrawingsDb().select().from(drawingsSchema.files)).length, before);
});

test('staged files older than 24 hours are orphaned and removed from storage once', async () => {
  const owner = person('drafter');
  const staged = await stageUpload(owner, 'pdf', 'old.pdf', 'application/pdf', await body(await samplePdf()));
  const removed = await cleanupStagedFiles(Date.now() + 25 * 3_600_000, 1000);
  assert.ok(removed >= 1);
  const [row] = await getDrawingsDb()
    .select()
    .from(drawingsSchema.files)
    .where(eq(drawingsSchema.files.id, staged.fileId));
  assert.equal(row.status, 'orphaned');
  assert.ok(row.orphanedAt);
  await assert.rejects(access(join(dir, 'store', row.storageKey)));
  await assert.rejects(stagedFileForOwner(owner, staged.fileId));
  assert.equal(await cleanupStagedFiles(Date.now() + 25 * 3_600_000, 1000), 0);
});

test('s3 driver against the S3-compatible test service: put, range get, head, no overwrite, delete', async () => {
  const endpoint = process.env.DRAWINGS_TEST_S3_ENDPOINT;
  assert.ok(endpoint, 'DRAWINGS_TEST_S3_ENDPOINT diperlukan (layanan s3 stack uji).');
  const bucket = 'drawings-test-' + randomUUID().slice(0, 8);
  const storage = new S3Storage({
    driver: 's3',
    endpoint,
    region: 'us-east-1',
    bucket,
    accessKeyId: process.env.DRAWINGS_TEST_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DRAWINGS_TEST_S3_SECRET_ACCESS_KEY!,
    forcePathStyle: true,
  });
  // The stack waits for the s3 healthcheck; retry briefly in case the gateway is still settling.
  for (let attempt = 1; ; attempt++) {
    try {
      await storage.rawClient.send(new CreateBucketCommand({ Bucket: bucket }));
      break;
    } catch (error) {
      if (attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  const bytes = await samplePdf(1);
  const input = await body(bytes);
  const key = storageKey(randomUUID(), 'pdf');
  await storage.put(key, input.path, {
    size: input.size,
    contentType: 'application/pdf',
    sha256: input.sha256,
  });
  await assert.rejects(
    storage.put(key, input.path, { size: input.size, contentType: 'application/pdf', sha256: input.sha256 }),
  );
  assert.deepEqual(await storage.head(key), { size: bytes.length });
  const part = await storage.get(key, { start: 1, end: 4 });
  assert.equal(part.size, bytes.length);
  assert.equal(await new Response(part.body).text(), 'PDF-');
  const meta = { storageKey: key, size: bytes.length, sha256: input.sha256, mime: 'application/pdf' };
  const partial = await serveFile(new Request('https://x/', { headers: { range: 'bytes=0-3' } }), meta, {
    name: 'a.pdf',
    storage,
  });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), `bytes 0-3/${bytes.length}`);
  assert.equal(await partial.text(), '%PDF');
  const full = await serveFile(new Request('https://x/'), meta, { name: 'a.pdf', storage });
  assert.equal(full.status, 200);
  assert.equal(Buffer.from(await full.arrayBuffer()).length, bytes.length);
  await storage.delete(key);
  assert.equal(await storage.head(key), null);
});
