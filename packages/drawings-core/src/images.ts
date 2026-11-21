// Gambar lampiran: WebP ≤ 2560 px tanpa metadata, plus thumbnail (desain 2026-11-21).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { AppError } from '@plant/contracts';
import {
  IMAGE_MAX_INPUT_PIXELS,
  IMAGE_MAX_SIDE,
  IMAGE_PASSTHROUGH_MAX_BYTES,
  THUMB_MAX_SIDE,
} from './config';

// libvips memakai memori di luar heap V8: tanpa cache operasi dan satu thread per gambar.
sharp.cache(false);
sharp.concurrency(1);

/** Bagian metadata `sharp` yang menentukan apakah WebP boleh disimpan apa adanya. */
export type ImageFacts = {
  format?: string;
  width?: number;
  height?: number;
  pages?: number;
  exif?: unknown;
  xmp?: unknown;
  iptc?: unknown;
  orientation?: number;
};

/** `false` hanya untuk WebP statis, tanpa metadata, ≤ 2560 px dan ≤ 1,5 MB. */
export function needsConversion(facts: ImageFacts, size: number): boolean {
  const { format, width, height, pages, exif, xmp, iptc, orientation } = facts;
  if (format !== 'webp' || !width || !height) return true;
  if (pages !== undefined && pages > 1) return true;
  if (exif !== undefined || xmp !== undefined || iptc !== undefined || orientation !== undefined) return true;
  return Math.max(width, height) > IMAGE_MAX_SIDE || size > IMAGE_PASSTHROUGH_MAX_BYTES;
}

/** Nama tampilan berekstensi `.webp`, maksimal 200 karakter dengan ekstensi utuh. */
export function webpName(name: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,8}$/, '');
  return base.slice(0, 200 - '.webp'.length) + '.webp';
}

export type ProcessedFile = { path: string; size: number; sha256: string };
export type ProcessedImage = { full: ProcessedFile; thumb: ProcessedFile; converted: boolean };

const INPUT = { failOn: 'warning', limitInputPixels: IMAGE_MAX_INPUT_PIXELS } as const;
const invalidImage = () => new AppError(422, 'Gambar harus JPEG, PNG atau WebP yang valid.', 'FILE_INVALID');

async function written(path: string): Promise<ProcessedFile> {
  const bytes = await readFile(path);
  return { path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/**
 * WebP bersih disimpan apa adanya; selainnya di-encode ulang (orientasi EXIF diterapkan, metadata
 * dibuang, ≤ 2560 px). Thumbnail selalu dibuat dari file final, sekaligus memvalidasi decode penuh.
 * File keluaran berada di samping `input.path`; pemanggil yang menghapusnya.
 */
export async function processImage(input: ProcessedFile): Promise<ProcessedImage> {
  // Header saja; batas piksel diperiksa sendiri agar pesannya jelas.
  const facts = await sharp(input.path, { failOn: 'warning', limitInputPixels: false })
    .metadata()
    .catch(() => {
      throw invalidImage();
    });
  if (!facts.width || !facts.height) throw invalidImage();
  if (facts.width * facts.height > IMAGE_MAX_INPUT_PIXELS)
    throw new AppError(422, 'Resolusi gambar terlalu besar.', 'FILE_INVALID');
  const converted = needsConversion(facts, input.size);
  try {
    let full = input;
    if (converted) {
      const path = input.path + '.webp';
      await sharp(input.path, { ...INPUT, autoOrient: true })
        .resize(IMAGE_MAX_SIDE, IMAGE_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4, smartSubsample: true })
        .toFile(path);
      full = await written(path);
    }
    const thumbPath = input.path + '.thumb.webp';
    await sharp(full.path, INPUT)
      .resize(THUMB_MAX_SIDE, THUMB_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(thumbPath);
    return { full, thumb: await written(thumbPath), converted };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw invalidImage();
  }
}

/** Antrean FIFO dengan `slots` pekerjaan bersamaan; menunggu lebih dari `waitMs` → 503 IMAGE_BUSY. */
export function createImageSlots(slots: number, waitMs: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const acquire = () =>
    new Promise<void>((resolve, reject) => {
      if (active < slots) {
        active++;
        return resolve();
      }
      const grant = () => {
        clearTimeout(timer);
        active++;
        resolve();
      };
      const timer = setTimeout(() => {
        waiting.splice(waiting.indexOf(grant), 1);
        reject(new AppError(503, 'Server sedang memproses gambar lain. Coba lagi.', 'IMAGE_BUSY'));
      }, waitMs);
      waiting.push(grant);
    });
  const release = () => {
    active--;
    waiting.shift()?.();
  };
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

const defaultSlots = createImageSlots(2, 30_000);
/** Membatasi pemrosesan gambar di proses ini menjadi 2 bersamaan. */
export function withImageSlot<T>(fn: () => Promise<T>): Promise<T> {
  return defaultSlots(fn);
}
