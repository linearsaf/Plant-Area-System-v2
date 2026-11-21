// Gambar lampiran: WebP ≤ 2560 px tanpa metadata, plus thumbnail (desain 2026-11-21).
import { IMAGE_MAX_SIDE, IMAGE_PASSTHROUGH_MAX_BYTES } from './config';

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
