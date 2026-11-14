// Helper bersama service Drawing Database: audit, parsing input, idempotensi, kunci baris, cursor.
import { createHash, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { AppError, IDEMPOTENCY_KEY, canonicalDocumentPayload, type Identity } from '@plant/contracts';
import { getDrawingsDb } from './database';
import { audit, drawings, idempotency } from './schema';

export const db = () => getDrawingsDb();
export type Db = ReturnType<typeof getDrawingsDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function mysqlCode(e: unknown): string | undefined {
  if (!e || typeof e !== 'object') return undefined;
  return (e as { code?: string }).code ?? mysqlCode((e as { cause?: unknown }).cause);
}
export function mysqlMessage(e: unknown): string {
  if (!e || typeof e !== 'object') return '';
  return (
    String((e as { sqlMessage?: string }).sqlMessage ?? '') + mysqlMessage((e as { cause?: unknown }).cause)
  );
}

export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path?.join('.');
    const unknownKey = issue?.code === 'unrecognized_keys';
    throw new AppError(
      400,
      unknownKey ? 'Data berisi isian yang tidak dikenal.' : issue?.message || `Isian ${field} tidak valid.`,
      'VALIDATION',
    );
  }
  return result.data;
}

export type AuditTarget = 'drawing' | 'revision' | 'file' | 'area' | 'discipline';
export function auditEntry(
  actor: Pick<Identity, 'id' | 'name'>,
  action: string,
  targetType: AuditTarget,
  targetId: string,
  details: Record<string, unknown> = {},
  drawingId: string | null = null,
  at = new Date(),
) {
  return {
    id: randomUUID(),
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetType,
    targetId,
    drawingId,
    details: JSON.stringify(details),
    createdAt: at,
  };
}
export async function writeAudit(tx: Tx | Db, ...args: Parameters<typeof auditEntry>) {
  await tx.insert(audit).values(auditEntry(...args));
}

/** Mengunci baris drawing (akar agregat) dan memeriksa `expectedVersion`. */
export async function lockDrawing(
  tx: Tx,
  id: string,
  expectedVersion?: number,
  visible: (row: typeof drawings.$inferSelect) => boolean = () => true,
) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError(404, 'Drawing tidak ditemukan.');
  const [row] = await tx.select().from(drawings).where(eq(drawings.id, id)).for('update');
  // Visibility before version: a hidden drawing must look the same as a missing one.
  if (!row || !visible(row)) throw new AppError(404, 'Drawing tidak ditemukan.');
  if (expectedVersion !== undefined && row.version !== expectedVersion)
    throw new AppError(
      409,
      'Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.',
      'VERSION_CONFLICT',
    );
  return row;
}

export type MutationResult<T> = {
  status: number;
  body: T;
  targetId: string;
  afterCommit?: () => Promise<void>;
};
/**
 * Menjalankan POST yang membuat data atau memindahkan status dengan `Idempotency-Key` per actor.
 * Izin harus diperiksa pemanggil sebelum fungsi ini (replay tidak melewati pemeriksaan izin).
 * Payload sama → respons semula; payload berbeda → 409.
 */
export async function idempotent<T>(
  actor: Identity,
  key: string | null,
  action: string,
  payload: unknown,
  run: (tx: Tx) => Promise<MutationResult<T>>,
): Promise<{ status: number; body: T; replayed: boolean }> {
  if (!key || !IDEMPOTENCY_KEY.test(key))
    throw new AppError(400, 'Idempotency-Key wajib, 8–128 karakter [A-Za-z0-9._:-].', 'IDEMPOTENCY_KEY');
  const hash = createHash('sha256')
    .update(action + '\0' + canonicalDocumentPayload({ payload: payload as Record<string, unknown> }))
    .digest('hex');
  const replay = async () => {
    const [old] = await db()
      .select()
      .from(idempotency)
      .where(and(eq(idempotency.actorId, actor.id), eq(idempotency.key, key)));
    if (!old) return null;
    if (old.hash !== hash || old.action !== action)
      throw new AppError(
        409,
        'Idempotency-Key sudah dipakai untuk permintaan berbeda.',
        'IDEMPOTENCY_CONFLICT',
      );
    return { status: old.status, body: JSON.parse(old.response) as T, replayed: true };
  };
  const previous = await replay();
  if (previous) return previous;
  let afterCommit: (() => Promise<void>) | undefined;
  try {
    const result = await db().transaction(async (tx) => {
      const outcome = await run(tx);
      await tx.insert(idempotency).values({
        id: randomUUID(),
        actorId: actor.id,
        key,
        hash,
        action,
        targetId: outcome.targetId,
        status: outcome.status,
        response: JSON.stringify(outcome.body),
        createdAt: new Date(),
      });
      afterCommit = outcome.afterCommit;
      return { status: outcome.status, body: outcome.body, replayed: false };
    });
    if (afterCommit) await afterCommit().catch(() => undefined);
    return result;
  } catch (e) {
    if (mysqlCode(e) === 'ER_DUP_ENTRY' && mysqlMessage(e).includes('drawing_idempotency_actor_key_uq')) {
      const value = await replay();
      if (value) return value;
    }
    throw e;
  }
}

/** Cursor stabil `waktu|id`, base64url. */
export function encodeCursor(at: Date | null, id: string) {
  return Buffer.from(`${at ? at.toISOString() : ''}|${id}`).toString('base64url');
}
export function decodeCursor(value: string | null) {
  if (!value) return null;
  const [at, id] = Buffer.from(value, 'base64url').toString('utf8').split('|');
  const time = new Date(at);
  if (!id || !/^[0-9a-f-]{36}$/.test(id) || !Number.isFinite(time.getTime()))
    throw new AppError(400, 'Cursor tidak valid.');
  return { at: time, id };
}
/** Tanggal WIB `YYYY-MM-DD` → awal hari dalam UTC. */
export function wibDayStart(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(400, `${label} harus YYYY-MM-DD.`);
  const time = new Date(`${value}T00:00:00+07:00`);
  if (!Number.isFinite(time.getTime())) throw new AppError(400, `${label} tidak valid.`);
  return time;
}
export const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
export const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => '\\' + c);
