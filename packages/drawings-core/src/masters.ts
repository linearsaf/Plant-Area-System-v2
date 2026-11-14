// Master Area dan Discipline (K10). Hanya admin yang mengubah; nonaktif tetap tampil pada data lama.
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import {
  AppError,
  canDraw,
  masterCreateSchema,
  masterUpdateSchema,
  type DrawingsMasters,
  type Identity,
  type MasterItem,
} from '@plant/contracts';
import { areas, disciplines } from './schema';
import { db, mysqlCode, parse, writeAudit, type Tx } from './support';

export type MasterKind = 'areas' | 'disciplines';
const tables = { areas, disciplines } as const;
const labels = { areas: 'Area', disciplines: 'Discipline' } as const;
const toItem = (r: typeof areas.$inferSelect): MasterItem => ({
  id: r.id,
  name: r.name,
  active: r.active,
  sortOrder: r.sortOrder,
  version: r.version,
});

export async function listMasters(): Promise<DrawingsMasters> {
  const [a, d] = await Promise.all([
    db().select().from(areas).orderBy(asc(areas.sortOrder), asc(areas.name)),
    db().select().from(disciplines).orderBy(asc(disciplines.sortOrder), asc(disciplines.name)),
  ]);
  return { areas: a.map(toItem), disciplines: d.map(toItem) };
}

function requireAdmin(actor: Identity) {
  if (!canDraw(actor, 'admin.manage'))
    throw new AppError(403, 'Hanya Admin Drawing Database yang dapat mengelola master.');
}

export async function createMaster(actor: Identity, kind: MasterKind, input: unknown) {
  requireAdmin(actor);
  const data = parse(masterCreateSchema, input);
  const table = tables[kind],
    now = new Date(),
    id = randomUUID();
  try {
    await db().transaction(async (tx) => {
      await tx
        .insert(table)
        .values({ id, ...data, active: true, version: 1, createdAt: now, updatedAt: now });
      await writeAudit(
        tx,
        actor,
        `master.${kind}.created`,
        kind === 'areas' ? 'area' : 'discipline',
        id,
        data,
      );
    });
  } catch (e) {
    if (mysqlCode(e) === 'ER_DUP_ENTRY')
      throw new AppError(409, `${labels[kind]} dengan nama itu sudah ada.`, 'DUPLICATE');
    throw e;
  }
  return { id, ...data, active: true, version: 1 } satisfies MasterItem;
}

export async function updateMaster(actor: Identity, kind: MasterKind, id: string, input: unknown) {
  requireAdmin(actor);
  const { expectedVersion, ...changes } = parse(masterUpdateSchema, input);
  const table = tables[kind];
  try {
    return await db().transaction(async (tx) => {
      const [row] = await tx.select().from(table).where(eq(table.id, id)).for('update');
      if (!row) throw new AppError(404, `${labels[kind]} tidak ditemukan.`);
      if (row.version !== expectedVersion)
        throw new AppError(
          409,
          'Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.',
          'VERSION_CONFLICT',
        );
      const next = { ...changes, version: row.version + 1, updatedAt: new Date() };
      await tx.update(table).set(next).where(eq(table.id, id));
      await writeAudit(tx, actor, `master.${kind}.updated`, kind === 'areas' ? 'area' : 'discipline', id, {
        before: toItem(row),
        changes,
      });
      return toItem({ ...row, ...next });
    });
  } catch (e) {
    if (mysqlCode(e) === 'ER_DUP_ENTRY')
      throw new AppError(409, `${labels[kind]} dengan nama itu sudah ada.`, 'DUPLICATE');
    throw e;
  }
}

/** Master untuk data baru harus ada dan aktif; master lama yang nonaktif tetap boleh dipertahankan. */
export async function requireActiveMaster(tx: Tx, kind: MasterKind, id: string, keep?: string | null) {
  const table = tables[kind];
  const [row] = await tx.select().from(table).where(eq(table.id, id)).for('share');
  if (!row) throw new AppError(400, `${labels[kind]} tidak ditemukan.`, 'VALIDATION');
  if (!row.active && row.id !== keep)
    throw new AppError(
      400,
      `${labels[kind]} ${row.name} sudah nonaktif dan tidak dapat dipilih.`,
      'VALIDATION',
    );
  return row;
}
