import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError, safeReturnTo, hasPermission, type Identity } from '@plant/contracts';

export function failure(error: unknown) {
  if (error instanceof AppError)
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  const requestId = crypto.randomUUID();
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'request.failed',
      requestId,
      errorType: error instanceof Error ? error.name : 'unknown',
    }),
  );
  return Response.json(
    { error: 'Layanan sementara tidak tersedia. Coba lagi.', requestId },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function verifyOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (
    !process.env.PUBLIC_ORIGIN ||
    origin !== process.env.PUBLIC_ORIGIN ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AppError(403, 'Origin tidak diizinkan.');
}
export async function readJson(request: Request, maxBytes = 128_000): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'Gunakan application/json.');
  if (Number(request.headers.get('content-length') || 0) > maxBytes)
    throw new AppError(413, 'Permintaan terlalu besar.');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'Body diperlukan.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError(413, 'Permintaan terlalu besar.');
    }
    chunks.push(value);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new AppError(400, 'JSON tidak valid.');
  }
}
const DRAIN_LIMIT = 64 * 1024 * 1024;
export type BinaryBody = { path: string; size: number; sha256: string; head: Buffer };
/**
 * Streams a binary request body to a temporary file while counting bytes and computing
 * SHA-256. The body is never held in memory. Requires `Content-Length`; rejects bodies
 * larger than `maxBytes` (413) or whose length differs from the header (400).
 * The caller owns `path` and must remove it.
 */
export async function readBinaryBody(
  request: Request,
  { maxBytes, directory = tmpdir() }: { maxBytes: number; directory?: string },
): Promise<BinaryBody> {
  const declared = request.headers.get('content-length');
  if (!declared || !/^\d{1,12}$/.test(declared)) throw new AppError(411, 'Content-Length diperlukan.');
  const expected = Number(declared);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'Body diperlukan.');
  // Closing the socket while a proxy still streams the body turns a 413 into a 502 at the
  // gateway. Discard (never store) a bounded oversized body before answering.
  const reject = async (error: AppError) => {
    let drained = 0;
    try {
      while (drained < DRAIN_LIMIT) {
        const { done, value } = await reader.read();
        if (done) break;
        drained += value.length;
      }
    } catch {}
    await reader.cancel().catch(() => undefined);
    return error;
  };
  if (expected > maxBytes) throw await reject(new AppError(413, 'File terlalu besar.', 'FILE_INVALID'));
  if (expected === 0) throw new AppError(400, 'File kosong.', 'FILE_INVALID');
  const path = join(directory, `plant-upload-${randomUUID()}`);
  const hash = createHash('sha256');
  const handle = await open(path, 'wx', 0o600);
  const head: Buffer[] = [];
  let size = 0,
    headSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > expected || size > maxBytes)
        throw await reject(
          new AppError(
            size > maxBytes ? 413 : 400,
            size > maxBytes ? 'File terlalu besar.' : 'Ukuran body tidak sesuai.',
            'FILE_INVALID',
          ),
        );
      if (headSize < 64) {
        head.push(Buffer.from(value.subarray(0, 64 - headSize)));
        headSize += Math.min(value.length, 64 - headSize);
      }
      hash.update(value);
      await handle.write(value);
    }
    if (size !== expected) throw new AppError(400, 'Ukuran body tidak sesuai.', 'FILE_INVALID');
  } catch (e) {
    await handle.close().catch(() => undefined);
    await rm(path, { force: true });
    throw e;
  }
  await handle.close();
  return { path, size, sha256: hash.digest('hex'), head: Buffer.concat(head) };
}
export function verifyInternal(request: Request) {
  const actual = request.headers.get('x-plant-service-token') || '',
    expected = process.env.SERVICE_TOKEN || '';
  const actualBytes = Buffer.from(actual),
    expectedBytes = Buffer.from(expected);
  if (
    expectedBytes.length < 32 ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  )
    throw new AppError(403, 'Akses internal ditolak.');
}
export async function fetchIdentity(cookie: string, allowPasswordChange = false): Promise<Identity> {
  const base = process.env.AUTH_INTERNAL_URL,
    token = process.env.SERVICE_TOKEN;
  if (!base || !token) throw new AppError(503, 'Konfigurasi autentikasi belum tersedia.');
  let response: Response;
  try {
    response = await fetch(
      `${base}/auth/internal/session${allowPasswordChange ? '?allowPasswordChange=1' : ''}`,
      {
        headers: { cookie, 'x-plant-service-token': token },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch {
    throw new AppError(503, 'Layanan autentikasi tidak tersedia.');
  }
  const body = await response.json();
  if (!response.ok)
    throw new AppError(
      response.status === 401 || response.status === 403 ? response.status : 503,
      body.error || 'Autentikasi tidak tersedia.',
      body.code,
    );
  return body.identity as Identity;
}
export type DirectoryPerson = { id: string; name: string; position: string; role: string };
/** Direktori pengguna aktif ber-grant pada aplikasi, dibaca dari Auth dengan token layanan. */
export async function fetchDirectory(app: 'drawings', roles?: readonly string[]): Promise<DirectoryPerson[]> {
  const base = process.env.AUTH_INTERNAL_URL,
    token = process.env.SERVICE_TOKEN;
  if (!base || !token) throw new AppError(503, 'Konfigurasi autentikasi belum tersedia.');
  const query = new URLSearchParams({ app });
  if (roles?.length) query.set('roles', roles.join(','));
  let response: Response;
  try {
    response = await fetch(`${base}/auth/internal/directory?${query}`, {
      headers: { 'x-plant-service-token': token },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AppError(503, 'Layanan autentikasi tidak tersedia.');
  }
  if (!response.ok) throw new AppError(503, 'Direktori pengguna tidak tersedia.');
  return ((await response.json()) as { people: DirectoryPerson[] }).people;
}
export async function pageIdentity(returnTo: string, allowPasswordChange = false) {
  try {
    return await fetchIdentity((await headers()).get('cookie') || '', allowPasswordChange);
  } catch (e) {
    if (e instanceof AppError && e.status === 401)
      redirect(`/auth/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
    if (e instanceof AppError && e.code === 'PASSWORD_CHANGE_REQUIRED') redirect('/auth/change-password');
    throw e;
  }
}
export async function apiIdentity(
  request: Request,
  action?: 'read' | 'write' | 'audit' | 'cancel',
  equipment?: string,
) {
  const identity = await fetchIdentity(request.headers.get('cookie') || '');
  if (action && !hasPermission(identity, action, equipment))
    throw new AppError(403, 'Akses aplikasi atau equipment belum diberikan.');
  return identity;
}
export async function proxyAuthManagement(request: Request, path: string) {
  if (request.method !== 'GET') verifyOrigin(request);
  const identity = await apiIdentity(request);
  if (path.startsWith('admin/') && !identity.portalAdmin)
    throw new AppError(403, 'Akses admin portal diperlukan.');
  const requestHeaders = new Headers({
    cookie: request.headers.get('cookie') || '',
    origin: process.env.PUBLIC_ORIGIN!,
    'content-type': 'application/json',
  });
  const response = await fetch(`${process.env.AUTH_INTERNAL_URL}/auth/manage/${path}`, {
    method: request.method,
    headers: requestHeaders,
    body: request.method === 'GET' ? undefined : JSON.stringify(await readJson(request)),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
