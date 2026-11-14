// Abstraksi object storage (PRD §6.2, K4). Driver `fs` untuk development/CI/sementara,
// driver `s3` untuk penyedia S3-compatible. Key dibuat server dan tidak pernah ditimpa.
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, rm, stat, link } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { AppError } from '@plant/contracts';
import { storageConfig, type StorageConfig } from './config';

export type ByteRange = { start: number; end: number }; // inklusif
export type StoredObject = { body: ReadableStream<Uint8Array>; size: number };
export interface Storage {
  readonly driver: 'fs' | 's3';
  /** Menyimpan file lokal pada key baru. Gagal bila key sudah ada. */
  put(
    key: string,
    sourcePath: string,
    meta: { size: number; contentType: string; sha256: string },
  ): Promise<void>;
  /** Membaca objek, opsional rentang byte inklusif. */
  get(key: string, range?: ByteRange): Promise<StoredObject>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}

export class StorageUnavailable extends AppError {
  constructor() {
    super(503, 'Penyimpanan file sementara tidak tersedia. Coba lagi.', 'STORAGE_UNAVAILABLE');
  }
}

const KEY_PATTERN = /^files\/\d{4}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;
export function assertKey(key: string) {
  if (!KEY_PATTERN.test(key)) throw Error('Storage key tidak valid.');
  return key;
}
export function storageKey(id: string, extension: 'pdf' | 'jpg' | 'png' | 'webp', now = new Date()) {
  return assertKey(`files/${now.getUTCFullYear()}/${id}.${extension}`);
}

export class FsStorage implements Storage {
  readonly driver = 'fs' as const;
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  private path(key: string) {
    const target = resolve(this.root, assertKey(key));
    if (!target.startsWith(this.root + sep)) throw Error('Storage key di luar root.');
    return target;
  }
  async put(key: string, sourcePath: string, meta: { size: number; contentType: string; sha256: string }) {
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true });
    // Copy to a private temporary name on the same volume, then hard-link: link fails when
    // the key exists, so an existing object is never overwritten.
    const temporary = join(dirname(target), `.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
    try {
      await copyFile(sourcePath, temporary);
      if ((await stat(temporary)).size !== meta.size) throw Error('Ukuran salinan tidak sesuai.');
      await link(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  async get(key: string, range?: ByteRange): Promise<StoredObject> {
    const path = this.path(key);
    const { size } = await stat(path);
    const stream = createReadStream(path, range ? { start: range.start, end: range.end } : {});
    return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array>, size };
  }
  async head(key: string) {
    try {
      return { size: (await stat(this.path(key))).size };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

export class S3Storage implements Storage {
  readonly driver = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(config: Extract<StorageConfig, { driver: 's3' }>) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Non-AWS providers often reject the default CRC checksums; send them only when required.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      maxAttempts: 3,
    });
  }
  async put(key: string, sourcePath: string, meta: { size: number; contentType: string; sha256: string }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
        Body: createReadStream(sourcePath),
        ContentLength: meta.size,
        ContentType: meta.contentType,
        Metadata: { sha256: meta.sha256 },
        // Never overwrite an existing key (supported by S3 and most S3-compatible providers).
        IfNoneMatch: '*',
      }),
    );
  }
  async get(key: string, range?: ByteRange): Promise<StoredObject> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
        Range: range ? `bytes=${range.start}-${range.end}` : undefined,
      }),
    );
    if (!result.Body) throw Error('Objek kosong.');
    const total = range
      ? Number(/\/(\d+)$/.exec(result.ContentRange ?? '')?.[1] ?? NaN)
      : Number(result.ContentLength);
    if (!Number.isFinite(total)) throw Error('Ukuran objek tidak diketahui.');
    return { body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>, size: total };
  }
  async head(key: string) {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: assertKey(key) }),
      );
      return { size: Number(result.ContentLength) };
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw e;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: assertKey(key) }));
  }
  /** Akses klien untuk uji (membuat bucket MinIO). */
  get rawClient() {
    return this.client;
  }
}

let cached: Storage | undefined;
export function createStorage(config: StorageConfig = storageConfig()): Storage {
  return config.driver === 'fs' ? new FsStorage(config.path) : new S3Storage(config);
}
export function getStorage(): Storage {
  try {
    return (cached ??= createStorage());
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', event: 'drawings.storage_config_invalid' }));
    throw new StorageUnavailable();
  }
}
/** Menjalankan operasi storage; kegagalan menjadi 503 STORAGE_UNAVAILABLE tanpa detail koneksi. */
export async function withStorage<T>(
  operation: (storage: Storage) => Promise<T>,
  storage: Storage = getStorage(),
): Promise<T> {
  try {
    return await operation(storage);
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'drawings.storage_failed',
        driver: storage.driver,
        errorType: e instanceof Error ? e.name : 'unknown',
      }),
    );
    throw new StorageUnavailable();
  }
}
