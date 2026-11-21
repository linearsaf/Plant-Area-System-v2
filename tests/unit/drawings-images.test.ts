import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { AppError } from '@plant/contracts';
import {
  assertKey,
  createImageSlots,
  needsConversion,
  processImage,
  thumbKey,
  webpName,
} from '@plant/drawings-core';

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'drawings-images-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function fixture(source: Sharp | Buffer) {
  const bytes = Buffer.isBuffer(source) ? source : await source.toBuffer();
  const path = join(dir, randomUUID());
  await writeFile(path, bytes);
  return { path, size: bytes.length, sha256: sha(bytes) };
}
const canvas = (width: number, height: number, channels: 3 | 4 = 3) =>
  sharp({ create: { width, height, channels, background: channels === 4 ? '#4a77' : '#4a7' } });
const invalid = (pattern: RegExp) => (e: unknown) =>
  e instanceof AppError && e.status === 422 && e.code === 'FILE_INVALID' && pattern.test(e.message);

const clean = { format: 'webp', width: 2560, height: 1440 };

test('clean small webp passes through', () => {
  assert.equal(needsConversion(clean, 1_000_000), false);
  assert.equal(needsConversion({ ...clean, pages: 1 }, 1000), false);
});

test('needsConversion flags every disqualifier', () => {
  for (const facts of [
    { ...clean, format: 'jpeg' },
    { ...clean, pages: 2 },
    { ...clean, exif: Buffer.from('x') },
    { ...clean, xmp: Buffer.from('x') },
    { ...clean, iptc: Buffer.from('x') },
    { ...clean, orientation: 6 },
    { ...clean, width: 2561 },
    { ...clean, height: 2561 },
    { format: 'webp' },
  ])
    assert.equal(needsConversion(facts, 1000), true, JSON.stringify(facts));
  assert.equal(needsConversion(clean, 1.5 * 1024 * 1024 + 1), true);
});

test('webpName swaps or appends the extension within 200 chars', () => {
  assert.equal(webpName('foto.JPG'), 'foto.webp');
  assert.equal(webpName('scan'), 'scan.webp');
  assert.equal(webpName('a.b.png'), 'a.b.webp');
  const long = webpName('x'.repeat(196) + '.jpg');
  assert.equal(long.length, 200);
  assert.ok(long.endsWith('.webp'));
});

test('thumbKey sits beside the full key and passes key validation', () => {
  const id = randomUUID(),
    now = new Date('2026-03-01T00:00:00Z');
  assert.equal(thumbKey(id, now), `files/2026/${id}.thumb.webp`);
  assert.equal(assertKey(thumbKey(id, now)), `files/2026/${id}.thumb.webp`);
  assert.throws(() => assertKey(`files/2026/${id}.thumb.png`));
});

test('clean webp passes through byte-identical with a thumbnail', async () => {
  const input = await fixture(canvas(1200, 800).webp({ quality: 80 }));
  const out = await processImage(input);
  assert.equal(out.converted, false);
  assert.equal(out.full.path, input.path);
  assert.equal(out.full.sha256, input.sha256);
  const t = await sharp(out.thumb.path).metadata();
  assert.equal(t.format, 'webp');
  assert.deepEqual([t.width, t.height], [480, 320]);
  assert.equal(out.thumb.sha256, sha(await readFile(out.thumb.path)));
  assert.equal(out.thumb.size, (await readFile(out.thumb.path)).length);
});

test('converts rotated JPEG upright and strips EXIF', async () => {
  const input = await fixture(canvas(4000, 3000).jpeg().withMetadata({ orientation: 6 }));
  const out = await processImage(input);
  const bytes = await readFile(out.full.path);
  const m = await sharp(bytes).metadata();
  assert.equal(out.converted, true);
  assert.equal(m.format, 'webp');
  assert.deepEqual([m.width, m.height], [1920, 2560]);
  assert.equal(m.exif, undefined);
  assert.equal(m.orientation, undefined);
  assert.equal(out.full.sha256, sha(bytes));
  assert.equal(out.full.size, bytes.length);
});

test('webp with exif is converted', async () => {
  const input = await fixture(
    canvas(800, 600)
      .webp()
      .withExif({ IFD0: { Copyright: 'GPS test' } }),
  );
  const out = await processImage(input);
  assert.equal(out.converted, true);
  assert.equal((await sharp(out.full.path).metadata()).exif, undefined);
});

test('oversized and animated webp are converted to a single 2560px frame', async () => {
  const wide = await processImage(await fixture(canvas(3000, 1000).webp()));
  const m = await sharp(wide.full.path).metadata();
  assert.equal(wide.converted, true);
  assert.deepEqual([m.width, m.height], [2560, 853]);
  const frame = (background: string) =>
    sharp({ create: { width: 64, height: 64, channels: 3, background } })
      .png()
      .toBuffer();
  const animated = await sharp([await frame('red'), await frame('blue')], { join: { animated: true } })
    .webp()
    .toBuffer();
  const still = await processImage(await fixture(animated));
  const a = await sharp(still.full.path).metadata();
  assert.equal(still.converted, true);
  assert.ok(a.pages === undefined || a.pages === 1);
  assert.equal(a.height, 64);
});

test('png with alpha becomes webp and keeps alpha', async () => {
  const out = await processImage(await fixture(canvas(600, 400, 4).png()));
  const m = await sharp(out.full.path).metadata();
  assert.equal(m.format, 'webp');
  assert.equal(m.hasAlpha, true);
});

test('corrupt image is rejected as FILE_INVALID', async () => {
  const input = await fixture(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(4096)]));
  await assert.rejects(processImage(input), invalid(/JPEG, PNG atau WebP yang valid/));
});

test('images over 120 megapixels are rejected', async () => {
  const input = await fixture(canvas(11000, 11000).png({ compressionLevel: 9 }));
  await assert.rejects(processImage(input), invalid(/Resolusi gambar terlalu besar/));
});

test('image slots run at most N at once and time out waiting callers', async () => {
  const run = createImageSlots(1, 50);
  let release!: () => void;
  const first = run(() => new Promise<void>((resolve) => (release = resolve)));
  await assert.rejects(
    run(async () => 1),
    (e) => e instanceof AppError && e.status === 503 && e.code === 'IMAGE_BUSY',
  );
  release();
  await first;
  assert.equal(await run(async () => 2), 2);
});
