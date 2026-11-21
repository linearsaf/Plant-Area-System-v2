import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assertKey, needsConversion, thumbKey, webpName } from '@plant/drawings-core';

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
