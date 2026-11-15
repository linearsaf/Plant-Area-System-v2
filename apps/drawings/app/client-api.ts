'use client';
// Helper fetch klien: galat API `{ error, code }` menjadi Error dengan pesan Indonesia.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function parse<T>(response: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {}
  if (!response.ok) {
    const b = (body ?? {}) as { error?: string; code?: string };
    throw new ApiError(
      b.error ||
        (response.status === 401 ? 'Sesi berakhir. Silakan login kembali.' : 'Permintaan gagal. Coba lagi.'),
      response.status,
      b.code,
    );
  }
  return body as T;
}
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch('/drawings/api/' + path, { cache: 'no-store', signal }));
}
/**
 * Mutasi JSON. POST yang membuat data/memindahkan status membawa `Idempotency-Key`; berikan key yang
 * sama saat mengulang submit yang sama agar server tidak menggandakan data.
 */
export async function sendJson<T>(
  method: 'POST' | 'PATCH',
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  return parse<T>(
    await fetch('/drawings/api/' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
export const newKey = () => crypto.randomUUID();
const wib = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'medium',
  timeStyle: 'short',
});
export const formatWib = (value: string | null | undefined) =>
  value ? `${wib.format(new Date(value))} WIB` : '–';
