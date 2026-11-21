import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin, compressedName, keepOriginal } from '../../apps/drawings/app/compress-image';

test('fitWithin keeps aspect ratio and never upscales', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2560), { width: 2560, height: 1920 });
  assert.deepEqual(fitWithin(3000, 4000, 2560), { width: 1920, height: 2560 });
  assert.deepEqual(fitWithin(3000, 1000, 2560), { width: 2560, height: 853 });
  assert.deepEqual(fitWithin(800, 600, 2560), { width: 800, height: 600 });
});

test('compressedName matches the encoded type', () => {
  assert.equal(compressedName('IMG_0001.JPG', 'image/webp'), 'IMG_0001.webp');
  assert.equal(compressedName('scan.png', 'image/jpeg'), 'scan.jpg');
  assert.equal(compressedName('foto', 'image/webp'), 'foto.webp');
});

test('keepOriginal protects PNG transparency and avoids larger results', () => {
  const base = { encodedSize: 100, originalSize: 1000, originalSmall: false };
  assert.equal(keepOriginal({ ...base, encodedType: 'image/webp', originalType: 'image/png' }), false);
  // Tanpa encoder WebP (Safari) PNG tidak di-JPEG-kan: piksel transparan akan menjadi hitam.
  assert.equal(keepOriginal({ ...base, encodedType: 'image/jpeg', originalType: 'image/png' }), true);
  assert.equal(keepOriginal({ ...base, encodedType: 'image/jpeg', originalType: 'image/jpeg' }), false);
  assert.equal(keepOriginal({ ...base, encodedType: 'image/png', originalType: 'image/jpeg' }), true);
  assert.equal(
    keepOriginal({
      encodedType: 'image/webp',
      originalType: 'image/jpeg',
      encodedSize: 1000,
      originalSize: 900,
      originalSmall: true,
    }),
    true,
  );
  assert.equal(
    keepOriginal({
      encodedType: 'image/webp',
      originalType: 'image/jpeg',
      encodedSize: 1000,
      originalSize: 900,
      originalSmall: false,
    }),
    false,
  );
});
