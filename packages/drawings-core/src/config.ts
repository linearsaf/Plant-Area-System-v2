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

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_PER_ITEM = 3;
export const STAGED_TTL_MS = 24 * 3_600_000;

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
