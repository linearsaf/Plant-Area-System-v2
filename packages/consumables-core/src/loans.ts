import { R22_ROOM_ID } from './room';
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  AppError,
  canonicalDocumentPayload,
  decimalString,
  decimalUnits,
  formatQuantity,
  validateStockQuantity,
  type Identity,
  type InventoryItem,
  type LoanRepaymentMethod,
  type StockLoan,
  type StockLoanDetail,
  type StockLoanRepayment,
  type StockLoanStatus,
} from '@plant/contracts';
import {
  audit,
  idempotency,
  inventory,
  loanRepayments,
  loans,
  locations,
  materials,
  movements,
} from './schema';
import {
  code,
  db,
  entry,
  invCols,
  joinInv,
  normalize,
  page,
  parse,
  positive,
  recordId,
  requireStock,
  rows,
  scope,
  search,
} from './support';

type Executor = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0] | ReturnType<typeof db>;

export const loanCols = sql`l.id,l.number,l.document_id AS documentId,d.number AS documentNumber,l.movement_id AS movementId,l.material_id AS materialId,l.lender_inventory_id AS lenderInventoryId,l.borrower_area AS borrowerArea,l.lender_area AS lenderArea,l.mmid,l.description,l.common_name AS commonName,l.unit,m.decimal_allowed AS decimalAllowed,l.hec,l.wo,l.requester_name AS requesterName,l.requester_nik AS requesterNik,l.quantity,l.returned_quantity AS returnedQuantity,l.status,l.note,l.actor_id AS actorId,l.actor_name AS actorName,l.created_at AS createdAt,l.updated_at AS updatedAt,l.settled_at AS settledAt`;

const repaymentCols = sql`r.id,r.loan_id AS loanId,r.method,r.quantity,r.borrower_inventory_id AS borrowerInventoryId,r.lender_inventory_id AS lenderInventoryId,r.out_movement_id AS outMovementId,r.in_movement_id AS inMovementId,r.note,r.actor_id AS actorId,r.actor_name AS actorName,r.created_at AS createdAt`;

export function normalizeLoan(raw: Record<string, unknown>): StockLoan {
  const quantity = String(raw.quantity ?? '0.000000');
  const returnedQuantity = String(raw.returnedQuantity ?? '0.000000');
  const remainingQuantity = decimalString(decimalUnits(quantity) - decimalUnits(returnedQuantity));
  return {
    ...(normalize(raw) as unknown as StockLoan),
    quantity,
    returnedQuantity,
    remainingQuantity,
    settledAt: raw.settledAt ? String(raw.settledAt) : null,
  };
}

export async function readLoanDetail(executor: Executor, loanId: string): Promise<StockLoanDetail | null> {
  const [rawLoan] = await rows<Record<string, unknown>>(
    executor,
    sql`SELECT ${loanCols} FROM stock_loans l JOIN stock_documents d ON d.id=l.document_id JOIN materials m ON m.id=l.material_id WHERE l.id=${loanId} AND l.location_id=${R22_ROOM_ID}`,
  );
  if (!rawLoan) return null;
  const loan = normalizeLoan(rawLoan);
  const repayments = await rows<StockLoanRepayment>(
    executor,
    sql`SELECT ${repaymentCols} FROM stock_loan_repayments r WHERE r.loan_id=${loanId} ORDER BY r.created_at DESC,r.id DESC`,
  );
  const [borrowerRaw] = await rows<InventoryItem>(
    executor,
    sql`SELECT ${invCols} FROM ${joinInv} WHERE i.material_id=${loan.materialId} AND i.location_id=${R22_ROOM_ID} AND i.rack=${loan.borrowerArea} LIMIT 1`,
  );
  const [lenderRaw] = await rows<InventoryItem>(
    executor,
    sql`SELECT ${invCols} FROM ${joinInv} WHERE i.id=${loan.lenderInventoryId} AND i.location_id=${R22_ROOM_ID} LIMIT 1`,
  );
  return {
    loan,
    repayments,
    borrowerStock: borrowerRaw ? normalize(borrowerRaw) : null,
    lenderStock: lenderRaw ? normalize(lenderRaw) : null,
  };
}

export async function listLoans(actor: Identity, p: URLSearchParams) {
  const statusParam = (p.get('status') || '').trim();
  if (statusParam && !['active', 'open', 'partial', 'settled', 'all'].includes(statusParam)) {
    throw new AppError(400, 'Filter status pinjaman tidak valid.');
  }
  const conditions = [
    scope(actor, sql`l.location_id`),
    ...search(p.get('q') || '', [
      sql`l.number`,
      sql`d.number`,
      sql`l.mmid`,
      sql`l.description`,
      sql`l.common_name`,
      sql`l.hec`,
      sql`l.wo`,
      sql`l.requester_name`,
      sql`l.borrower_area`,
      sql`l.lender_area`,
      sql`l.note`,
    ]),
  ];
  if (statusParam === 'active') conditions.push(sql`l.status IN ('open','partial')`);
  else if (statusParam && statusParam !== 'all') conditions.push(sql`l.status=${statusParam}`);
  const borrowerArea = (p.get('borrowerArea') || '').trim();
  if (borrowerArea) conditions.push(sql`l.borrower_area=${borrowerArea}`);
  const lenderArea = (p.get('lenderArea') || '').trim();
  if (lenderArea) conditions.push(sql`l.lender_area=${lenderArea}`);
  const documentId = (p.get('documentId') || '').trim();
  if (documentId) conditions.push(sql`l.document_id=${documentId}`);
  const materialId = (p.get('materialId') || '').trim();
  if (materialId) conditions.push(sql`l.material_id=${materialId}`);

  const result = await page<Record<string, unknown> & { id: string }>(
    sql`SELECT ${loanCols},l.created_at AS cursorSort FROM stock_loans l JOIN stock_documents d ON d.id=l.document_id JOIN materials m ON m.id=l.material_id`,
    conditions,
    sql`l.created_at`,
    sql`l.id`,
    p,
    true,
  );
  const [counts] = await rows<Record<string, number | string>>(
    db(),
    sql`SELECT COALESCE(SUM(status IN ('open','partial')),0) AS activeCount,COALESCE(SUM(status='open'),0) AS openCount,COALESCE(SUM(status='partial'),0) AS partialCount,COALESCE(SUM(status='settled'),0) AS settledCount FROM stock_loans WHERE location_id=${R22_ROOM_ID}`,
  );
  return {
    items: result.items.map((item) => normalizeLoan(item)),
    nextCursor: result.nextCursor,
    counts: {
      active: Number(counts?.activeCount || 0),
      open: Number(counts?.openCount || 0),
      partial: Number(counts?.partialCount || 0),
      settled: Number(counts?.settledCount || 0),
    },
  };
}

export async function loanDetail(actor: Identity, id: string) {
  requireStock(actor, 'read');
  const detail = await readLoanDetail(db(), id);
  if (!detail) throw new AppError(404, 'Catatan pinjaman tidak ditemukan.');
  return detail;
}

const repaymentSchema = z
  .object({
    method: z.enum(['transfer', 'physical_return']),
    quantity: positive,
    borrowerInventoryId: recordId.optional(),
    note: z.string().trim().max(500).default(''),
  })
  .strict();

export async function repayLoan(actor: Identity, loanId: string, body: unknown, key: string | null) {
  requireStock(actor, 'return');
  if (!recordId.safeParse(loanId).success) throw new AppError(400, 'ID pinjaman tidak valid.');
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key))
    throw new AppError(400, 'Idempotency-Key wajib, 8–128 karakter.');
  const input = parse(repaymentSchema, body) as {
    method: LoanRepaymentMethod;
    quantity: string;
    borrowerInventoryId?: string;
    note: string;
  };
  const hash = createHash('sha256')
    .update(canonicalDocumentPayload({ action: 'loan.repay', loanId, ...input }))
    .digest('hex');

  async function replay(executor: Executor, locked = false) {
    const query = executor
      .select()
      .from(idempotency)
      .where(and(eq(idempotency.actorId, actor.id), eq(idempotency.key, key!)));
    const [old] = locked ? await query.for('update') : await query;
    if (!old) return null;
    if (old.hash !== hash || !old.repaymentId)
      throw new AppError(409, 'Key sudah digunakan untuk payload berbeda.');
    const [repayment] = await rows<StockLoanRepayment>(
      executor,
      sql`SELECT ${repaymentCols} FROM stock_loan_repayments r WHERE r.id=${old.repaymentId}`,
    );
    const detail = await readLoanDetail(executor, loanId);
    if (!detail || !repayment) throw new AppError(404, 'Catatan pelunasan tidak ditemukan.');
    return { ...detail, repayment, replayed: true };
  }

  const prev = await replay(db());
  if (prev) return prev;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db().transaction(async (tx) => {
        const [location] = await tx
          .select()
          .from(locations)
          .where(eq(locations.id, R22_ROOM_ID))
          .for('update');
        if (!location?.active) throw new AppError(409, 'Konfigurasi R22 tidak aktif.');

        const [loan] = await tx
          .select()
          .from(loans)
          .where(and(eq(loans.id, loanId), eq(loans.locationId, R22_ROOM_ID)))
          .for('update');
        if (!loan) throw new AppError(404, 'Catatan pinjaman tidak ditemukan.');

        const [material] = await tx
          .select()
          .from(materials)
          .where(eq(materials.id, loan.materialId))
          .for('update');
        if (!material || !material.active) throw new AppError(409, 'Material tidak aktif.');

        const again = await replay(tx, true);
        if (again) return again;

        if (loan.status === 'settled') throw new AppError(409, 'Pinjaman ini sudah lunas.');
        let q: string;
        try {
          q = validateStockQuantity(input.quantity, material.decimalAllowed);
        } catch (e) {
          throw new AppError(400, (e as Error).message);
        }
        const totalUnits = decimalUnits(loan.quantity);
        const prevReturnedUnits = decimalUnits(loan.returnedQuantity);
        const remainingUnits = totalUnits - prevReturnedUnits;
        const payUnits = decimalUnits(q);
        if (payUnits > remainingUnits) {
          throw new AppError(
            409,
            `Jumlah pelunasan melebihi sisa pinjaman (${formatQuantity(decimalString(remainingUnits))} ${loan.unit}).`,
          );
        }

        // Determine inventories to lock in deterministic ID order to avoid deadlocks.
        let borrowerInvId: string | null = null;
        if (input.method === 'transfer') {
          const candidates = await tx
            .select({ id: inventory.id, rack: inventory.rack })
            .from(inventory)
            .where(and(eq(inventory.materialId, loan.materialId), eq(inventory.locationId, R22_ROOM_ID)));
          const match = input.borrowerInventoryId
            ? candidates.find((c) => c.id === input.borrowerInventoryId && c.rack === loan.borrowerArea)
            : candidates.find((c) => c.rack === loan.borrowerArea);
          if (!match) {
            throw new AppError(
              409,
              `Stok material di Area Kerja ${loan.borrowerArea} belum terdaftar untuk transfer pelunasan.`,
            );
          }
          borrowerInvId = match.id;
        }

        const idsToLock = Array.from(
          new Set([loan.lenderInventoryId, ...(borrowerInvId ? [borrowerInvId] : [])]),
        ).sort();
        const lockedInv = new Map<string, typeof inventory.$inferSelect>();
        for (const invId of idsToLock) {
          const [inv] = await tx.select().from(inventory).where(eq(inventory.id, invId)).for('update');
          if (inv) lockedInv.set(invId, inv);
        }

        const lenderInv = lockedInv.get(loan.lenderInventoryId);
        if (!lenderInv || !lenderInv.active || !lenderInv.initialized) {
          throw new AppError(409, `Daftar stok Area Kerja ${loan.lenderArea} belum siap atau nonaktif.`);
        }

        const now = new Date();
        let outMovementId: string | null = null;

        if (input.method === 'transfer') {
          const borrowerInv = lockedInv.get(borrowerInvId!);
          if (!borrowerInv || !borrowerInv.active || !borrowerInv.initialized) {
            throw new AppError(409, `Daftar stok Area Kerja ${loan.borrowerArea} belum siap atau nonaktif.`);
          }
          if (borrowerInv.id === lenderInv.id) {
            throw new AppError(400, 'Area peminjam dan pemberi tidak boleh sama.');
          }
          const borrowerBefore = decimalUnits(borrowerInv.quantity);
          if (payUnits > borrowerBefore) {
            throw new AppError(
              409,
              `Stok di Area Kerja ${loan.borrowerArea} tidak mencukupi (tersedia ${formatQuantity(borrowerInv.quantity)} ${loan.unit}).`,
            );
          }
          const borrowerAfter = decimalString(borrowerBefore - payUnits);
          await tx
            .update(inventory)
            .set({ quantity: borrowerAfter, version: borrowerInv.version + 1 })
            .where(eq(inventory.id, borrowerInv.id));

          outMovementId = randomUUID();
          await tx.insert(movements).values({
            id: outMovementId,
            inventoryId: borrowerInv.id,
            materialId: material.id,
            locationId: location.id,
            mmid: material.mmid,
            description: material.description,
            commonName: material.commonName,
            unit: material.unit,
            locationName: location.name,
            workArea: borrowerInv.rack,
            borrowedFromArea: loan.lenderArea,
            loanId: loan.id,
            type: 'loan_out',
            quantity: decimalString(-payUnits),
            balanceAfter: borrowerAfter,
            packs: null,
            packSize: null,
            reference: loan.number,
            wo: loan.wo,
            job: loan.hec,
            reason: input.note || `Pelunasan pinjaman ke ${loan.lenderArea}`,
            actorId: actor.id,
            actorName: actor.name,
            createdAt: now,
          });
          await tx.insert(audit).values(
            entry(actor, 'stock.loan_out', outMovementId, {
              loanId: loan.id,
              loanNumber: loan.number,
              inventoryId: borrowerInv.id,
              before: borrowerInv.quantity,
              quantity: decimalString(-payUnits),
              balanceAfter: borrowerAfter,
            }),
          );
        }

        let lenderAfter: string;
        try {
          lenderAfter = decimalString(decimalUnits(lenderInv.quantity) + payUnits);
        } catch {
          throw new AppError(400, 'Saldo area pemberi melampaui kapasitas.');
        }
        await tx
          .update(inventory)
          .set({ quantity: lenderAfter, version: lenderInv.version + 1 })
          .where(eq(inventory.id, lenderInv.id));

        const inMovementId = randomUUID();
        const inType = input.method === 'transfer' ? 'loan_in' : 'loan_return';
        await tx.insert(movements).values({
          id: inMovementId,
          inventoryId: lenderInv.id,
          materialId: material.id,
          locationId: location.id,
          mmid: material.mmid,
          description: material.description,
          commonName: material.commonName,
          unit: material.unit,
          locationName: location.name,
          workArea: lenderInv.rack,
          borrowedFromArea: loan.borrowerArea,
          loanId: loan.id,
          type: inType,
          quantity: decimalString(payUnits),
          balanceAfter: lenderAfter,
          packs: null,
          packSize: null,
          reference: loan.number,
          wo: loan.wo,
          job: loan.hec,
          reason:
            input.note ||
            (input.method === 'transfer'
              ? `Pelunasan pinjaman dari ${loan.borrowerArea}`
              : `Pengembalian fisik pinjaman dari ${loan.borrowerArea}`),
          actorId: actor.id,
          actorName: actor.name,
          createdAt: now,
        });
        await tx.insert(audit).values(
          entry(actor, `stock.${inType}`, inMovementId, {
            loanId: loan.id,
            loanNumber: loan.number,
            inventoryId: lenderInv.id,
            before: lenderInv.quantity,
            quantity: decimalString(payUnits),
            balanceAfter: lenderAfter,
          }),
        );

        const repaymentId = randomUUID();
        const repaymentRow = {
          id: repaymentId,
          loanId: loan.id,
          method: input.method,
          quantity: q,
          borrowerInventoryId: borrowerInvId,
          lenderInventoryId: lenderInv.id,
          outMovementId,
          inMovementId,
          note: input.note,
          actorId: actor.id,
          actorName: actor.name,
          createdAt: now,
        };
        await tx.insert(loanRepayments).values(repaymentRow);

        const nextReturnedUnits = prevReturnedUnits + payUnits;
        const nextStatus: StockLoanStatus = nextReturnedUnits >= totalUnits ? 'settled' : 'partial';
        await tx
          .update(loans)
          .set({
            returnedQuantity: decimalString(nextReturnedUnits),
            status: nextStatus,
            updatedAt: now,
            settledAt: nextStatus === 'settled' ? now : null,
          })
          .where(eq(loans.id, loan.id));

        await tx.insert(idempotency).values({
          id: randomUUID(),
          actorId: actor.id,
          key: key!,
          hash,
          repaymentId,
        });
        await tx.insert(audit).values(
          entry(actor, 'loan.repaid', loan.id, {
            loanNumber: loan.number,
            repaymentId,
            method: input.method,
            quantity: q,
            status: nextStatus,
            borrowerArea: loan.borrowerArea,
            lenderArea: loan.lenderArea,
          }),
        );

        const detail = (await readLoanDetail(tx, loan.id))!;
        const repayment = detail.repayments.find((r) => r.id === repaymentId)!;
        return { ...detail, repayment, replayed: false };
      });
    } catch (e) {
      if (code(e) === 'ER_DUP_ENTRY') {
        const value = await replay(db());
        if (value) return value;
      }
      if (attempt < 2 && ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(code(e) || '')) continue;
      throw e;
    }
  }
  throw new AppError(503, 'Transaksi sibuk. Coba kembali dengan key yang sama.');
}
