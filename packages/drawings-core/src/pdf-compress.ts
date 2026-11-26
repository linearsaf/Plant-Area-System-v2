// Kompresi PDF hybrid: re-kompresi raster selektif (sharp) + optimasi struktural & linearisasi (qpdf).
// Vektor, font, layer OCG, dan gambar 1-bit monochrome tetap utuh; aturan never-worse menjamin fallback aman.
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from '@cantoo/pdf-lib';
import sharp from 'sharp';
import {
  PDF_COMPRESS_MIN_SAVING_BYTES,
  PDF_COMPRESS_MIN_SAVING_RATIO,
  PDF_IMAGE_MAX_MAX_SIDE,
  PDF_IMAGE_MAX_PIXELS,
  PDF_IMAGE_MAX_RAW_BYTES,
  PDF_IMAGE_MIN_BYTES,
  PDF_IMAGE_MIN_MAX_SIDE,
  PDF_IMAGE_MIN_SIDE,
  PDF_IMAGE_TARGET_DPI,
  PDF_QPDF_TIMEOUT_MS,
  pdfCompressionEnabled,
} from './config';
import type { ProcessedFile } from './images';
import { assertStampable, parsePdfDocument, serialPdfJob } from './pdf';

// libvips memakai memori di luar heap V8: tanpa cache operasi dan satu thread per gambar.
sharp.cache(false);
sharp.concurrency(1);

export type ImageXObjectCandidate = {
  width: number;
  height: number;
  channels: 1 | 3;
  filter: 'none' | 'flate' | 'dct';
};

export type ProcessedPdf = {
  file: ProcessedFile;
  pageCount: number;
  compressed: boolean;
};

/**
 * Menghitung batas sisi terpanjang raster (px) proporsional terhadap halaman PDF terbesar
 * pada target ~220 DPI, diklem [2560, 7000] agar A4 turun aman dan A1/A0 tetap tajam.
 */
export function maxRasterSideForPages(pageSizesPt: { width: number; height: number }[]): number {
  const maxPt = pageSizesPt.reduce((max, p) => Math.max(max, p.width || 0, p.height || 0), 0);
  if (maxPt <= 0) return PDF_IMAGE_MIN_MAX_SIDE;
  const target = Math.ceil((maxPt / 72) * PDF_IMAGE_TARGET_DPI);
  return Math.min(PDF_IMAGE_MAX_MAX_SIDE, Math.max(PDF_IMAGE_MIN_MAX_SIDE, target));
}

/** Aturan never-worse: hasil diterima hanya bila hemat minimal 1 KB dan 2% dari ukuran asli. */
export function shouldKeepCompressed(originalSize: number, candidateSize: number): boolean {
  if (candidateSize <= 0 || originalSize <= 0) return false;
  const minSaving = Math.max(
    PDF_COMPRESS_MIN_SAVING_BYTES,
    Math.floor(originalSize * PDF_COMPRESS_MIN_SAVING_RATIO),
  );
  return originalSize - candidateSize >= minSaving;
}

function resolveColorChannels(dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  if (cs === PDFName.of('DeviceRGB')) return 3;
  if (cs === PDFName.of('DeviceGray')) return 1;
  if (cs instanceof PDFArray && cs.size() >= 2 && cs.lookup(0) === PDFName.of('ICCBased')) {
    const profile = cs.lookup(1);
    if (profile instanceof PDFStream) {
      const n = profile.dict.lookup(PDFName.of('N'));
      if (n instanceof PDFNumber) {
        const count = n.asNumber();
        if (count === 1 || count === 3) return count;
      }
    }
  }
  return null;
}

function resolveImageFilter(dict: PDFDict): 'none' | 'flate' | 'dct' | null {
  let filter = dict.lookup(PDFName.of('Filter'));
  if (filter instanceof PDFArray) {
    if (filter.size() !== 1) return null;
    filter = filter.lookup(0);
  }
  if (filter === undefined || filter === PDFNull) return 'none';
  if (filter === PDFName.of('DCTDecode')) return 'dct';
  if (filter === PDFName.of('FlateDecode')) {
    // @cantoo/pdf-lib maupun zlib.inflateSync tidak membalikkan predictor PNG/TIFF; lewati Predictor > 1.
    let parms = dict.lookup(PDFName.of('DecodeParms'));
    if (parms instanceof PDFArray) {
      if (parms.size() !== 1) return null;
      parms = parms.lookup(0);
    }
    if (parms instanceof PDFDict) {
      const pred = parms.lookup(PDFName.of('Predictor'));
      if (pred !== undefined && pred !== PDFNull) {
        if (!(pred instanceof PDFNumber) || pred.asNumber() !== 1) return null;
      }
    } else if (parms !== undefined && parms !== PDFNull) {
      return null;
    }
    return 'flate';
  }
  return null;
}

/**
 * Memeriksa apakah sebuah Image XObject aman untuk di-recompress menjadi baseline JPEG.
 * Menolak 1-bit monochrome, CMYK, Indexed, SMask/Mask, custom Decode, predictor > 1, atau ukuran kecil.
 */
export function inspectImageXObject(dict: PDFDict, byteLength: number): ImageXObjectCandidate | null {
  if (dict.lookup(PDFName.of('Subtype')) !== PDFName.of('Image')) return null;
  if (dict.lookup(PDFName.of('ImageMask')) === PDFBool.True) return null;
  if (
    dict.get(PDFName.of('Mask')) !== undefined ||
    dict.get(PDFName.of('SMask')) !== undefined ||
    dict.get(PDFName.of('Decode')) !== undefined
  ) {
    return null;
  }
  const w = dict.lookup(PDFName.of('Width'));
  const h = dict.lookup(PDFName.of('Height'));
  if (!(w instanceof PDFNumber) || !(h instanceof PDFNumber)) return null;
  const width = w.asNumber();
  const height = h.asNumber();
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
  if (Math.max(width, height) < PDF_IMAGE_MIN_SIDE || byteLength < PDF_IMAGE_MIN_BYTES) return null;
  if (width * height > PDF_IMAGE_MAX_PIXELS) return null;

  const bpc = dict.lookup(PDFName.of('BitsPerComponent'));
  if (!(bpc instanceof PDFNumber) || bpc.asNumber() !== 8) return null;

  const channels = resolveColorChannels(dict);
  if (!channels) return null;

  const filter = resolveImageFilter(dict);
  if (!filter) return null;

  if (filter !== 'dct' && width * height * channels > PDF_IMAGE_MAX_RAW_BYTES) return null;

  return { width, height, channels, filter };
}

/**
 * Tahap 1: mengompres ulang Image XObject raster yang memenuhi syarat di dalam PDFDocument.
 * Mengembalikan jumlah XObject yang diganti; vektor dan font tidak tersentuh.
 */
export async function recompressPdfImages(doc: PDFDocument, maxSide: number): Promise<number> {
  // Jangan sentuh stream yang dipakai sebagai SMask atau Mask oleh objek gambar lain.
  const maskRefs = new Set<PDFRef>();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFDict ? obj : obj instanceof PDFRawStream ? obj.dict : null;
    if (!dict) continue;
    for (const key of ['SMask', 'Mask'] as const) {
      const val = dict.get(PDFName.of(key));
      if (val instanceof PDFRef) maskRefs.add(val);
    }
  }

  let replaced = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || maskRefs.has(ref)) continue;
    const candidate = inspectImageXObject(obj.dict, obj.contents.length);
    if (!candidate) continue;

    try {
      let img: ReturnType<typeof sharp>;
      if (candidate.filter === 'dct') {
        img = sharp(Buffer.from(obj.contents.buffer, obj.contents.byteOffset, obj.contents.byteLength), {
          failOn: 'warning',
          limitInputPixels: PDF_IMAGE_MAX_PIXELS,
        });
      } else {
        const expected = candidate.width * candidate.height * candidate.channels;
        const raw =
          candidate.filter === 'flate'
            ? inflateSync(obj.contents, { maxOutputLength: expected })
            : Buffer.from(obj.contents.buffer, obj.contents.byteOffset, obj.contents.byteLength);
        if (raw.length !== expected) continue;
        img = sharp(raw, {
          raw: { width: candidate.width, height: candidate.height, channels: candidate.channels },
          limitInputPixels: PDF_IMAGE_MAX_PIXELS,
        });
      }

      let pipeline = img.resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true });
      if (candidate.channels === 1) {
        pipeline = pipeline.toColorspace('b-w').jpeg({
          quality: 82,
          progressive: false,
          optimiseCoding: true,
          trellisQuantisation: true,
        });
      } else {
        pipeline = pipeline.toColorspace('srgb').jpeg({
          quality: 82,
          chromaSubsampling: '4:4:4',
          progressive: false,
          optimiseCoding: true,
          trellisQuantisation: true,
        });
      }

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      if (info.channels !== candidate.channels || info.width <= 0 || info.height <= 0) continue;
      if (data.length >= Math.floor(obj.contents.length * 0.9)) continue;

      const newDict = doc.context.obj({
        Type: 'XObject',
        Subtype: 'Image',
        Width: info.width,
        Height: info.height,
        ColorSpace: candidate.channels === 1 ? 'DeviceGray' : 'DeviceRGB',
        BitsPerComponent: 8,
        Filter: 'DCTDecode',
        Length: data.length,
      });
      const interpolate = obj.dict.get(PDFName.of('Interpolate'));
      if (interpolate !== undefined) newDict.set(PDFName.of('Interpolate'), interpolate);

      doc.context.assign(
        ref,
        PDFRawStream.of(newDict, new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
      );
      replaced++;
    } catch {
      continue;
    }
  }
  return replaced;
}

let qpdfUnavailableLogged = false;

/**
 * Tahap 2: optimasi struktural lossless (recompress flate, object streams, dan linearize) via `qpdf`.
 * Mengembalikan `true` bila `outputPath` berhasil dibuat dan tidak kosong.
 */
export async function optimizePdfWithQpdf(inputPath: string, outputPath: string): Promise<boolean> {
  const ok = await new Promise<boolean>((resolve) => {
    execFile(
      'qpdf',
      [
        '--stream-data=compress',
        '--recompress-flate',
        '--compression-level=9',
        '--object-streams=generate',
        '--linearize',
        '--',
        inputPath,
        outputPath,
      ],
      { timeout: PDF_QPDF_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error) => {
        if (!error) return resolve(true);
        const code = (error as { code?: number | string }).code;
        // qpdf mengembalikan exit code 3 saat berhasil dengan warning minor pada PDF sumber.
        if (code === 3) return resolve(true);
        if (code === 'ENOENT') {
          if (!qpdfUnavailableLogged) {
            qpdfUnavailableLogged = true;
            console.warn(JSON.stringify({ level: 'warn', event: 'drawings.pdf_qpdf_unavailable' }));
          }
          return resolve(false);
        }
        console.warn(
          JSON.stringify({
            level: 'warn',
            event: 'drawings.pdf_qpdf_failed',
            code: code ?? 'unknown',
          }),
        );
        resolve(false);
      },
    );
  });
  if (!ok) {
    await rm(outputPath, { force: true });
    return false;
  }
  try {
    const { size } = await stat(outputPath);
    if (size > 0) return true;
  } catch {}
  await rm(outputPath, { force: true });
  return false;
}

/**
 * Memvalidasi PDF dan menjalankan kompresi hybrid secara serial per proses.
 * Selalu memastikan hasil akhir dapat di-parse, berhalaman identik, dan lolos uji stamp.
 * File sementara dibuat di samping `input.path` dan dibersihkan oleh pemanggil.
 */
export async function processPdf(
  input: ProcessedFile,
  options?: { compress?: boolean },
): Promise<ProcessedPdf> {
  return serialPdfJob(async () => {
    const originalBytes = await readFile(input.path);
    const { doc, pageCount } = await parsePdfDocument(originalBytes);
    const compress = (options?.compress ?? true) && pdfCompressionEnabled();
    if (!compress) {
      await assertStampable(originalBytes);
      return { file: input, pageCount, compressed: false };
    }

    const pageSizes = Array.from({ length: pageCount }, (_, i) => doc.getPage(i).getSize());
    const maxSide = maxRasterSideForPages(pageSizes);
    const reimgPath = input.path + '.reimg.pdf';
    let stage1Path = input.path;
    let stage1Size = input.size;

    try {
      const replaced = await recompressPdfImages(doc, maxSide);
      if (replaced > 0) {
        const reimgBytes = await doc.save({ useObjectStreams: true });
        if (reimgBytes.length < input.size) {
          await writeFile(reimgPath, reimgBytes);
          stage1Path = reimgPath;
          stage1Size = reimgBytes.length;
        }
      }
    } catch {
      console.warn(JSON.stringify({ level: 'warn', event: 'drawings.pdf_reimg_failed' }));
    }

    const qpdfPath = input.path + '.qpdf.pdf';
    let bestPath = stage1Path;
    let bestSize = stage1Size;
    if (await optimizePdfWithQpdf(stage1Path, qpdfPath)) {
      try {
        const qpdfSize = (await stat(qpdfPath)).size;
        if (qpdfSize > 0 && qpdfSize < bestSize) {
          bestPath = qpdfPath;
          bestSize = qpdfSize;
        }
      } catch {}
    }

    if (bestPath !== input.path && shouldKeepCompressed(input.size, bestSize)) {
      try {
        const candidateBytes = await readFile(bestPath);
        const check = await parsePdfDocument(candidateBytes);
        if (check.pageCount !== pageCount) throw Error('pageCount mismatch');
        await assertStampable(candidateBytes);
        return {
          file: {
            path: bestPath,
            size: candidateBytes.length,
            sha256: createHash('sha256').update(candidateBytes).digest('hex'),
          },
          pageCount,
          compressed: true,
        };
      } catch {
        console.warn(JSON.stringify({ level: 'warn', event: 'drawings.pdf_compress_fallback' }));
      }
    }

    await assertStampable(originalBytes);
    return { file: input, pageCount, compressed: false };
  });
}
