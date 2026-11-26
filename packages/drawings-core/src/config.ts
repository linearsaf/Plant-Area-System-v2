// Konfigurasi file Drawing Database dari environment (PRD §6, §10).
export type StorageConfig =
  | { driver: 'fs'; path: string }
  | {
      driver: 's3';
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };

export { IMAGE_MAX_PER_ITEM } from '@plant/contracts';
/** Batas body gambar mentah; browser biasanya sudah mengecilkannya jauh di bawah ini. */
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
/** Sisi terpanjang gambar tersimpan dan thumbnail-nya. */
export const IMAGE_MAX_SIDE = 2560;
export const THUMB_MAX_SIDE = 480;
/** WebP dari browser di atas ukuran ini di-encode ulang walau sudah bersih. */
export const IMAGE_PASSTHROUGH_MAX_BYTES = 1.5 * 1024 * 1024;
/** Batas resolusi input (lebar × tinggi), cukup untuk kamera HP 108 MP. */
export const IMAGE_MAX_INPUT_PIXELS = 120_000_000;
export const STAGED_TTL_MS = 24 * 3_600_000;

/** Batas aman untuk re-kompresi raster selektif dan optimasi qpdf pada PDF. */
export const PDF_IMAGE_MIN_BYTES = 32 * 1024;
export const PDF_IMAGE_MIN_SIDE = 300;
export const PDF_IMAGE_MAX_PIXELS = 60_000_000;
export const PDF_IMAGE_MAX_RAW_BYTES = 96 * 1024 * 1024;
export const PDF_IMAGE_TARGET_DPI = 220;
export const PDF_IMAGE_MIN_MAX_SIDE = 2560;
export const PDF_IMAGE_MAX_MAX_SIDE = 7000;
export const PDF_COMPRESS_MIN_SAVING_BYTES = 1024;
export const PDF_COMPRESS_MIN_SAVING_RATIO = 0.02;
export const PDF_QPDF_TIMEOUT_MS = 20_000;

/** Kill-switch operasional kompresi PDF (`DRAWINGS_PDF_COMPRESSION=on|off`, default `on`). */
export function pdfCompressionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.DRAWINGS_PDF_COMPRESSION?.trim().toLowerCase();
  if (!raw || raw === 'on') return true;
  if (raw === 'off') return false;
  throw Error('DRAWINGS_PDF_COMPRESSION harus on atau off.');
}

export function maxPdfBytes(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.DRAWINGS_MAX_PDF_MB?.trim();
  const mb = raw ? Number(raw) : 25;
  if (!Number.isInteger(mb) || mb < 1 || mb > 200)
    throw Error('DRAWINGS_MAX_PDF_MB harus bilangan bulat 1–200.');
  return mb * 1024 * 1024;
}

export function storageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const driver = env.DRAWINGS_STORAGE_DRIVER?.trim() || 'fs';
  if (driver === 'fs') {
    const path = env.DRAWINGS_STORAGE_PATH?.trim();
    if (!path) throw Error('DRAWINGS_STORAGE_PATH diperlukan untuk driver fs.');
    return { driver, path };
  }
  if (driver === 's3') {
    const required = {
      endpoint: env.DRAWINGS_S3_ENDPOINT,
      region: env.DRAWINGS_S3_REGION,
      bucket: env.DRAWINGS_S3_BUCKET,
      accessKeyId: env.DRAWINGS_S3_ACCESS_KEY_ID,
      secretAccessKey: env.DRAWINGS_S3_SECRET_ACCESS_KEY,
    };
    for (const [key, value] of Object.entries(required))
      if (!value?.trim()) throw Error(`Konfigurasi S3 belum lengkap: ${key}.`);
    const endpoint = new URL(required.endpoint!.trim());
    if (endpoint.protocol !== 'https:' && endpoint.protocol !== 'http:')
      throw Error('DRAWINGS_S3_ENDPOINT harus URL http(s).');
    return {
      driver,
      endpoint: endpoint.toString().replace(/\/$/, ''),
      region: required.region!.trim(),
      bucket: required.bucket!.trim(),
      accessKeyId: required.accessKeyId!.trim(),
      secretAccessKey: required.secretAccessKey!,
      forcePathStyle: (env.DRAWINGS_S3_FORCE_PATH_STYLE?.trim() || 'true') === 'true',
    };
  }
  throw Error('DRAWINGS_STORAGE_DRIVER harus fs atau s3.');
}
