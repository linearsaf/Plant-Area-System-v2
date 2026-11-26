import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  rgb,
} from '@cantoo/pdf-lib';
import {
  inspectImageXObject,
  maxRasterSideForPages,
  optimizePdfWithQpdf,
  pdfCompressionEnabled,
  processPdf,
  shouldKeepCompressed,
  stampPdf,
} from '@plant/drawings-core';

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'drawings-pdf-compress-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function hasQpdf(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('qpdf', ['--version'], (err) => resolve(!err));
  });
}

function makeRasterRaw(width: number, height: number, channels: 1 | 3): Buffer {
  const buf = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const onGrid = x % 120 < 2 || y % 120 < 2;
      const base = onGrid ? 30 : Math.min(252, 220 + ((x + y) >> 6));
      if (channels === 1) {
        buf[idx] = base;
      } else {
        buf[idx] = base;
        buf[idx + 1] = onGrid ? 40 : Math.min(252, base - 2);
        buf[idx + 2] = onGrid ? 80 : Math.min(252, base - 4);
      }
    }
  }
  return buf;
}

async function pdfWithImageXObject(options: {
  width: number;
  height: number;
  channels: 1 | 3;
  pageSize?: [number, number];
  flate?: boolean;
  withSMask?: boolean;
  bitsPerComponent?: number;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage(options.pageSize ?? [595.28, 841.89]);
  const bpc = options.bitsPerComponent ?? 8;
  const raw =
    bpc === 1
      ? Buffer.alloc(Math.ceil(options.width / 8) * options.height, 0xaa)
      : makeRasterRaw(options.width, options.height, options.channels);
  const streamBytes = options.flate ? deflateSync(raw) : raw;
  const dict = doc.context.obj({
    Type: 'XObject',
    Subtype: 'Image',
    Width: options.width,
    Height: options.height,
    ColorSpace: options.channels === 1 ? 'DeviceGray' : 'DeviceRGB',
    BitsPerComponent: bpc,
    ...(options.flate ? { Filter: 'FlateDecode' } : {}),
    Length: streamBytes.length,
  });
  if (options.withSMask) {
    const maskRaw = Buffer.alloc(options.width * options.height, 255);
    const maskRef = doc.context.register(
      PDFRawStream.of(
        doc.context.obj({
          Type: 'XObject',
          Subtype: 'Image',
          Width: options.width,
          Height: options.height,
          ColorSpace: 'DeviceGray',
          BitsPerComponent: 8,
          Length: maskRaw.length,
        }),
        maskRaw,
      ),
    );
    dict.set(PDFName.of('SMask'), maskRef);
  }
  const ref = doc.context.register(PDFRawStream.of(dict, streamBytes));
  page.node.set(PDFName.of('Resources'), doc.context.obj({ XObject: { Im1: ref } }));
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

test('pdfCompressionEnabled reads DRAWINGS_PDF_COMPRESSION and rejects invalid values', () => {
  assert.equal(pdfCompressionEnabled({}), true);
  assert.equal(pdfCompressionEnabled({ DRAWINGS_PDF_COMPRESSION: 'on' }), true);
  assert.equal(pdfCompressionEnabled({ DRAWINGS_PDF_COMPRESSION: 'OFF' }), false);
  assert.throws(() => pdfCompressionEnabled({ DRAWINGS_PDF_COMPRESSION: 'yes' }));
});

test('maxRasterSideForPages scales ~220 DPI proportionally and clamps to [2560, 7000]', () => {
  assert.equal(maxRasterSideForPages([]), 2560);
  assert.equal(maxRasterSideForPages([{ width: 400, height: 300 }]), 2560);
  assert.equal(maxRasterSideForPages([{ width: 595.28, height: 841.89 }]), 2573); // A4
  assert.equal(maxRasterSideForPages([{ width: 1190.55, height: 841.89 }]), 3638); // A3
  assert.equal(maxRasterSideForPages([{ width: 2383.94, height: 1683.78 }]), 7000); // A1 clamped
});

test('shouldKeepCompressed enforces at least 1 KB and 2% saving', () => {
  assert.equal(shouldKeepCompressed(100_000, 100_000), false);
  assert.equal(shouldKeepCompressed(100_000, 105_000), false);
  assert.equal(shouldKeepCompressed(10_000, 9_500), false); // < 1 KB
  assert.equal(shouldKeepCompressed(100_000, 98_500), false); // < 2%
  assert.equal(shouldKeepCompressed(100_000, 98_000), true); // exactly 2% >= 1 KB
  assert.equal(shouldKeepCompressed(20_000, 18_976), true); // >= 1024 and >= 2%
});

test('inspectImageXObject accepts safe 8-bit RGB/Gray/ICCBased and rejects unsafe/small XObjects', async () => {
  const doc = await PDFDocument.create();
  const base = () =>
    doc.context.obj({
      Type: 'XObject',
      Subtype: 'Image',
      Width: 1000,
      Height: 800,
      ColorSpace: 'DeviceRGB',
      BitsPerComponent: 8,
      Filter: 'FlateDecode',
    });

  assert.deepEqual(inspectImageXObject(base(), 64_000), {
    width: 1000,
    height: 800,
    channels: 3,
    filter: 'flate',
  });

  const gray = base();
  gray.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
  gray.delete(PDFName.of('Filter'));
  assert.deepEqual(inspectImageXObject(gray, 64_000), {
    width: 1000,
    height: 800,
    channels: 1,
    filter: 'none',
  });

  const iccStream = doc.context.register(
    PDFRawStream.of(doc.context.obj({ N: 3, Length: 4 }), Buffer.from('test')),
  );
  const icc = base();
  const iccArr = PDFArray.withContext(doc.context);
  iccArr.push(PDFName.of('ICCBased'));
  iccArr.push(iccStream);
  icc.set(PDFName.of('ColorSpace'), iccArr);
  assert.equal(inspectImageXObject(icc, 64_000)?.channels, 3);

  // Reject small size or small dimensions
  assert.equal(inspectImageXObject(base(), 10_000), null);
  const tiny = base();
  tiny.set(PDFName.of('Width'), PDFNumber.of(200));
  tiny.set(PDFName.of('Height'), PDFNumber.of(200));
  assert.equal(inspectImageXObject(tiny, 64_000), null);

  // Reject 1-bit, CMYK, SMask, ImageMask, Decode, Predictor > 1
  const mono = base();
  mono.set(PDFName.of('BitsPerComponent'), PDFNumber.of(1));
  assert.equal(inspectImageXObject(mono, 64_000), null);

  const cmyk = base();
  cmyk.set(PDFName.of('ColorSpace'), PDFName.of('DeviceCMYK'));
  assert.equal(inspectImageXObject(cmyk, 64_000), null);

  const smask = base();
  smask.set(PDFName.of('SMask'), PDFName.of('Dummy'));
  assert.equal(inspectImageXObject(smask, 64_000), null);

  const imgMask = base();
  imgMask.set(PDFName.of('ImageMask'), PDFBool.True);
  assert.equal(inspectImageXObject(imgMask, 64_000), null);

  const customDecode = base();
  customDecode.set(PDFName.of('Decode'), doc.context.obj([1, 0, 1, 0, 1, 0]));
  assert.equal(inspectImageXObject(customDecode, 64_000), null);

  const predictor = base();
  predictor.set(PDFName.of('DecodeParms'), doc.context.obj({ Predictor: 12 }));
  assert.equal(inspectImageXObject(predictor, 64_000), null);
});

test('processPdf compresses large RGB and Grayscale raster PDFs while keeping them stampable', async () => {
  for (const channels of [3, 1] as const) {
    const bytes = await pdfWithImageXObject({ width: 1200, height: 900, channels });
    const path = join(dir, `raster-${channels}.pdf`);
    await writeFile(path, bytes);
    const out = await processPdf({ path, size: bytes.length, sha256: sha(bytes) });
    assert.equal(out.compressed, true);
    assert.equal(out.pageCount, 1);
    assert.ok(out.file.size < bytes.length * 0.5, `expected >50% shrink for ch=${channels}`);
    const outBytes = await readFile(out.file.path);
    const loaded = await PDFDocument.load(outBytes);
    assert.equal(loaded.getPageCount(), 1);
    const stamped = await stampPdf(outBytes, [
      { title: 'Check', name: 'A', role: 'Leader', decidedAt: new Date() },
    ]);
    assert.equal((await PDFDocument.load(stamped)).getPageCount(), 1);
  }
});

test('processPdf never enlarges pure-vector PDFs and leaves 1-bit/SMask XObjects untouched', async () => {
  const vecDoc = await PDFDocument.create();
  const page = vecDoc.addPage([841.89, 595.28]);
  page.drawLine({ start: { x: 20, y: 20 }, end: { x: 800, y: 550 }, thickness: 1, color: rgb(0, 0, 0) });
  const vecBytes = Buffer.from(await vecDoc.save());
  const vecPath = join(dir, 'vector.pdf');
  await writeFile(vecPath, vecBytes);
  const vecOut = await processPdf({ path: vecPath, size: vecBytes.length, sha256: sha(vecBytes) });
  assert.equal(vecOut.pageCount, 1);
  assert.ok(vecOut.file.size <= vecBytes.length);

  // 1-bit monochrome XObject must not be converted to DCTDecode
  const monoBytes = await pdfWithImageXObject({
    width: 1600,
    height: 1600,
    channels: 1,
    bitsPerComponent: 1,
  });
  const monoPath = join(dir, 'mono.pdf');
  await writeFile(monoPath, monoBytes);
  const monoOut = await processPdf({ path: monoPath, size: monoBytes.length, sha256: sha(monoBytes) });
  const monoLoaded = await PDFDocument.load(await readFile(monoOut.file.path));
  const filters = Array.from(monoLoaded.context.enumerateIndirectObjects())
    .map(([, obj]) => (obj instanceof PDFRawStream ? obj.dict.lookup(PDFName.of('Filter')) : undefined))
    .filter(Boolean);
  assert.equal(filters.includes(PDFName.of('DCTDecode')), false);

  // SMask XObject must not be converted to DCTDecode
  const smaskBytes = await pdfWithImageXObject({
    width: 600,
    height: 600,
    channels: 3,
    withSMask: true,
  });
  const smaskPath = join(dir, 'smask.pdf');
  await writeFile(smaskPath, smaskBytes);
  const smaskOut = await processPdf({
    path: smaskPath,
    size: smaskBytes.length,
    sha256: sha(smaskBytes),
  });
  const smaskLoaded = await PDFDocument.load(await readFile(smaskOut.file.path));
  const smaskFilters = Array.from(smaskLoaded.context.enumerateIndirectObjects())
    .map(([, obj]) => (obj instanceof PDFRawStream ? obj.dict.lookup(PDFName.of('Filter')) : undefined))
    .filter(Boolean);
  assert.equal(smaskFilters.includes(PDFName.of('DCTDecode')), false);
});

test('processPdf skips compression when compress=false or DRAWINGS_PDF_COMPRESSION=off', async () => {
  const bytes = await pdfWithImageXObject({ width: 1000, height: 800, channels: 3 });
  const inputSha = sha(bytes);
  const path = join(dir, 'skip.pdf');
  await writeFile(path, bytes);

  const byOpt = await processPdf({ path, size: bytes.length, sha256: inputSha }, { compress: false });
  assert.equal(byOpt.compressed, false);
  assert.equal(byOpt.file.sha256, inputSha);
  assert.equal(byOpt.file.size, bytes.length);

  const prev = process.env.DRAWINGS_PDF_COMPRESSION;
  process.env.DRAWINGS_PDF_COMPRESSION = 'off';
  try {
    const byEnv = await processPdf({ path, size: bytes.length, sha256: inputSha });
    assert.equal(byEnv.compressed, false);
    assert.equal(byEnv.file.sha256, inputSha);
  } finally {
    if (prev === undefined) delete process.env.DRAWINGS_PDF_COMPRESSION;
    else process.env.DRAWINGS_PDF_COMPRESSION = prev;
  }
});

test('optimizePdfWithQpdf linearizes PDFs when qpdf is installed', async (t) => {
  if (!(await hasQpdf())) {
    t.skip('qpdf binary not installed in this environment');
    return;
  }
  const doc = await PDFDocument.create();
  doc.addPage([841.89, 595.28]);
  const bytes = await doc.save({ useObjectStreams: false });
  const inPath = join(dir, 'qpdf-in.pdf');
  const outPath = join(dir, 'qpdf-out.pdf');
  await writeFile(inPath, bytes);
  assert.equal(await optimizePdfWithQpdf(inPath, outPath), true);
  const head = (await readFile(outPath)).subarray(0, 1024).toString('latin1');
  assert.match(head, /\/Linearized/);
});
