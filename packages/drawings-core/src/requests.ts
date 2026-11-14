// Drawing Request (PRD §4.6): intake → review Draft Leader → assignment → Drafter menerima →
// draft drawing → selesai saat revisi pertama Completed atau drawing di-void.
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import {
  AppError,
  canDraw,
  canSeeRequest,
  drafterDecisionSchema,
  drawingsRole,
  requestCancelSchema,
  requestCreateSchema,
  requestNumber,
  requestReviewSchema,
  requestScopes,
  requestStatusLabels,
  requestStatuses,
  requestStatusTone,
  wibYear,
  type Identity,
  type RequestDetail,
  type RequestListItem,
  type RequestScope,
  type RequestStatus,
  type TaskItem,
} from '@plant/contracts';
import { drawings, files, requests, revisions, sequences } from './schema';
import { notify } from './notifications';
import { db, decodeCursor, encodeCursor, idempotent, parse, writeAudit, type Tx } from './support';
import type { DirectoryPerson } from './drawings';

type RequestRow = typeof requests.$inferSelect;
const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v);
const link = (r: { id: string }) => `/drawings/requests/${r.id}`;

/** Nomor berikutnya per jenis dan tahun; baris sekuens dikunci di dalam transaksi pemanggil. */
async function nextSequence(tx: Tx, kind: string, year: number) {
  await tx
    .insert(sequences)
    .values({ kind, year, lastValue: 0 })
    .onDuplicateKeyUpdate({ set: { kind: sql`${sequences.kind}` } });
  const [row] = await tx
    .select()
    .from(sequences)
    .where(and(eq(sequences.kind, kind), eq(sequences.year, year)))
    .for('update');
  const value = row.lastValue + 1;
  await tx
    .update(sequences)
    .set({ lastValue: value })
    .where(and(eq(sequences.kind, kind), eq(sequences.year, year)));
  return value;
}
async function lockRequest(tx: Tx, actor: Identity, id: string, expectedVersion: number) {
  if (!isId(id)) throw new AppError(404, 'Request tidak ditemukan.');
  const [r] = await tx.select().from(requests).where(eq(requests.id, id)).for('update');
  if (!r || !canSeeRequest(actor, r)) throw new AppError(404, 'Request tidak ditemukan.');
  if (r.version !== expectedVersion)
    throw new AppError(
      409,
      'Data sudah diubah pengguna lain. Muat ulang lalu coba lagi.',
      'VERSION_CONFLICT',
    );
  return r;
}
function requireStatus(r: RequestRow, ...allowed: RequestStatus[]) {
  if (!allowed.includes(r.status as RequestStatus))
    throw new AppError(
      409,
      'Status request sudah berubah atau aksi ini tidak berlaku.',
      'INVALID_TRANSITION',
    );
}
async function update(tx: Tx, r: RequestRow, set: Partial<RequestRow>, at: Date) {
  await tx
    .update(requests)
    .set({ ...set, version: r.version + 1, updatedAt: at })
    .where(eq(requests.id, r.id));
  return r.version + 1;
}
const audit = (
  tx: Tx,
  actor: Identity,
  action: string,
  r: RequestRow,
  details: Record<string, unknown>,
  at: Date,
) => writeAudit(tx, actor, action, 'request', r.id, { number: r.number, ...details }, r.drawingId, at);

// ───────────────────────── Mutasi ─────────────────────────

export async function createRequest(actor: Identity, input: unknown, key: string | null) {
  if (!canDraw(actor, 'request.create'))
    throw new AppError(403, 'Role Anda tidak dapat membuat Drawing Request.');
  const data = parse(requestCreateSchema, input);
  return idempotent(actor, key, 'request.create', data, async (tx) => {
    const now = new Date(),
      id = randomUUID(),
      year = wibYear(now.getTime());
    const number = requestNumber(year, await nextSequence(tx, 'request', year));
    await tx.insert(requests).values({
      id,
      number,
      requesterId: actor.id,
      requesterName: actor.name,
      hac: data.hac,
      description: data.description,
      purpose: data.purpose,
      status: 'pending_review',
      createdAt: now,
      updatedAt: now,
    });
    if (data.imageIds.length) {
      if (new Set(data.imageIds).size !== data.imageIds.length)
        throw new AppError(400, 'Gambar duplikat.', 'VALIDATION');
      const images = await tx.select().from(files).where(inArray(files.id, data.imageIds)).for('update');
      if (
        images.length !== data.imageIds.length ||
        images.some((f) => f.ownerId !== actor.id || f.status !== 'staged' || f.kind !== 'image')
      )
        throw new AppError(
          400,
          'Gambar referensi tidak ditemukan atau sudah dipakai. Unggah ulang.',
          'FILE_INVALID',
        );
      await tx
        .update(files)
        .set({
          status: 'attached',
          purpose: 'reference',
          parentType: 'request',
          parentId: id,
          attachedAt: now,
        })
        .where(inArray(files.id, data.imageIds));
    }
    await writeAudit(
      tx,
      actor,
      'request.created',
      'request',
      id,
      { number, hac: data.hac, images: data.imageIds.length },
      null,
      now,
    );
    return { status: 201, body: { id, number }, targetId: id };
  });
}

export async function reviewRequest(
  actor: Identity,
  id: string,
  input: unknown,
  key: string | null,
  directory: () => Promise<DirectoryPerson[]>,
) {
  if (!canDraw(actor, 'request.review'))
    throw new AppError(403, 'Hanya Draft Leader atau Admin yang mereview request.');
  const data = parse(requestReviewSchema, input);
  const drafter =
    data.decision === 'assign'
      ? (await directory()).find((p) => p.id === data.drafterId && p.role === 'drafter')
      : undefined;
  if (data.decision === 'assign' && !drafter)
    throw new AppError(400, 'Drafter harus pengguna aktif ber-role Drafter.', 'VALIDATION');
  return idempotent(actor, key, `request.review:${id}`, data, async (tx) => {
    const r = await lockRequest(tx, actor, id, data.expectedVersion);
    requireStatus(r, 'pending_review', 'drafter_rejected');
    const now = new Date();
    if (data.decision === 'reject') {
      const version = await update(
        tx,
        r,
        {
          status: 'review_rejected',
          reviewerId: actor.id,
          reviewerName: actor.name,
          reviewNote: data.note,
          closedAt: now,
          closeReason: 'Ditolak Draft Leader',
        },
        now,
      );
      await audit(tx, actor, 'request.review_rejected', r, { note: data.note }, now);
      await notify(
        tx,
        actor,
        {
          recipientId: r.requesterId,
          kind: 'request.rejected',
          title: `${r.number} ditolak`,
          body: data.note,
          href: link(r),
          sourceKey: `request:${r.id}:review_rejected`,
        },
        now,
      );
      return { status: 200, body: { id: r.id, status: 'review_rejected', version }, targetId: r.id };
    }
    const version = await update(
      tx,
      r,
      {
        status: 'waiting_drafter_acceptance',
        reviewerId: actor.id,
        reviewerName: actor.name,
        reviewNote: data.note,
        drafterId: drafter!.id,
        drafterName: drafter!.name,
        drafterNote: '',
      },
      now,
    );
    await audit(tx, actor, 'request.assigned', r, { drafter: drafter!.name, note: data.note }, now);
    await notify(
      tx,
      actor,
      {
        recipientId: drafter!.id,
        kind: 'request.assigned',
        title: `${r.number} ditugaskan kepada Anda`,
        body: r.description.slice(0, 200),
        href: link(r),
        sourceKey: `request:${r.id}:assigned:${drafter!.id}:v${version}`,
      },
      now,
    );
    return { status: 200, body: { id: r.id, status: 'waiting_drafter_acceptance', version }, targetId: r.id };
  });
}

export async function drafterDecision(actor: Identity, id: string, input: unknown, key: string | null) {
  if (!canDraw(actor, 'request.drafter_decision'))
    throw new AppError(403, 'Hanya Drafter yang ditugaskan dapat menjawab.');
  const data = parse(drafterDecisionSchema, input);
  type Result = { id: string; status: string; version: number; drawingId?: string };
  return idempotent<Result>(actor, key, `request.drafter:${id}`, data, async (tx) => {
    const r = await lockRequest(tx, actor, id, data.expectedVersion);
    if (r.drafterId !== actor.id)
      throw new AppError(403, 'Request ini tidak ditugaskan kepada Anda.', 'NOT_ASSIGNEE');
    requireStatus(r, 'waiting_drafter_acceptance');
    const now = new Date();
    if (data.decision === 'reject') {
      // Kembali ke antrean Draft Leader untuk ditugaskan ulang atau ditolak.
      const version = await update(tx, r, { status: 'drafter_rejected', drafterNote: data.note }, now);
      await audit(tx, actor, 'request.drafter_rejected', r, { note: data.note }, now);
      return { status: 200, body: { id: r.id, status: 'drafter_rejected', version }, targetId: r.id };
    }
    // Draft tanpa nomor, nama, discipline dan file: wajib dilengkapi sebelum Submit (§4.6 langkah 4).
    const drawingId = randomUUID(),
      revisionId = randomUUID();
    await tx.insert(drawings).values({
      id: drawingId,
      number: null,
      title: null,
      hac: r.hac,
      disciplineId: null,
      description: r.description,
      ownerId: actor.id,
      ownerName: actor.name,
      uploaderId: actor.id,
      uploaderName: actor.name,
      source: 'standard',
      currentRevisionId: revisionId,
      workStatus: 'draft',
      requestId: r.id,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(revisions).values({
      id: revisionId,
      drawingId,
      revisionNo: '0',
      status: 'draft',
      createdById: actor.id,
      createdByName: actor.name,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(
      tx,
      actor,
      'drawing.created',
      'drawing',
      drawingId,
      { fromRequest: r.number, revisionId },
      drawingId,
      now,
    );
    const version = await update(tx, r, { status: 'in_progress', drawingId, drafterNote: data.note }, now);
    await audit(tx, actor, 'request.accepted', { ...r, drawingId }, {}, now);
    await notify(
      tx,
      actor,
      {
        recipientId: r.requesterId,
        kind: 'request.accepted',
        title: `${r.number} sedang dikerjakan`,
        body: `Diterima ${actor.name}.`,
        href: link(r),
        sourceKey: `request:${r.id}:accepted`,
      },
      now,
    );
    return { status: 200, body: { id: r.id, status: 'in_progress', drawingId, version }, targetId: r.id };
  });
}

export async function cancelRequest(actor: Identity, id: string, input: unknown, key: string | null) {
  const data = parse(requestCancelSchema, input);
  return idempotent(actor, key, `request.cancel:${id}`, data, async (tx) => {
    const r = await lockRequest(tx, actor, id, data.expectedVersion);
    if (r.requesterId !== actor.id) throw new AppError(403, 'Hanya pemohon yang dapat membatalkan request.');
    requireStatus(r, 'pending_review');
    const now = new Date();
    const version = await update(
      tx,
      r,
      {
        status: 'closed',
        closedAt: now,
        closeReason: data.reason ? `Dibatalkan pemohon: ${data.reason}` : 'Dibatalkan pemohon',
      },
      now,
    );
    await audit(tx, actor, 'request.cancelled', r, { reason: data.reason }, now);
    return { status: 200, body: { id: r.id, status: 'closed', version }, targetId: r.id };
  });
}

/** Dipanggil dari transaksi drawing: menutup request asal saat drawing terbit pertama kali atau di-void. */
export async function closeRequestForDrawing(
  tx: Tx,
  actor: Identity,
  drawing: { id: string; requestId: string | null; number: string | null },
  reason: 'released' | { voided: string },
  at: Date,
) {
  if (!drawing.requestId) return;
  const [r] = await tx.select().from(requests).where(eq(requests.id, drawing.requestId)).for('update');
  if (!r || r.status === 'closed' || r.status === 'review_rejected') return;
  const released = reason === 'released';
  const closeReason = released ? 'Drawing terbit' : `Drawing dibatalkan: ${reason.voided}`;
  await update(tx, r, { status: 'closed', closedAt: at, closeReason }, at);
  await audit(
    tx,
    actor,
    released ? 'request.closed' : 'request.closed_void',
    r,
    { drawingId: drawing.id },
    at,
  );
  await notify(
    tx,
    actor,
    {
      recipientId: r.requesterId,
      kind: released ? 'request.completed' : 'request.closed',
      title: released ? `${r.number} selesai: Final Drawing terbit` : `${r.number} ditutup`,
      body: released ? `Drawing ${drawing.number ?? ''} dapat dibuka.` : closeReason,
      href: released ? `/drawings/library/${drawing.id}` : link(r),
      sourceKey: `request:${r.id}:closed`,
    },
    at,
  );
}

// ───────────────────────── Baca ─────────────────────────

const toItem = (r: RequestRow): RequestListItem => ({
  id: r.id,
  number: r.number,
  hac: r.hac,
  description: r.description,
  status: r.status as RequestStatus,
  requester: { id: r.requesterId, name: r.requesterName },
  drafter: r.drafterId ? { id: r.drafterId, name: r.drafterName ?? '' } : null,
  drawingId: r.drawingId,
  updatedAt: r.updatedAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
});

export async function listRequests(actor: Identity, params: URLSearchParams) {
  const scopes = requestScopes(actor);
  if (!scopes.length) throw new AppError(403, 'Akses Drawing Request tidak tersedia.');
  const scope = (params.get('scope') || scopes[scopes.length - 1]) as RequestScope;
  if (!scopes.includes(scope)) throw new AppError(403, 'Cakupan request ini tidak tersedia untuk role Anda.');
  const status = params.get('status');
  if (status && !(requestStatuses as readonly string[]).includes(status))
    throw new AppError(400, 'Status tidak dikenal.');
  const q = params.get('q')?.trim().slice(0, 40);
  const cursor = decodeCursor(params.get('cursor'));
  const rows = await db()
    .select()
    .from(requests)
    .where(
      and(
        scope === 'mine'
          ? eq(requests.requesterId, actor.id)
          : scope === 'assigned'
            ? eq(requests.drafterId, actor.id)
            : undefined,
        status ? eq(requests.status, status) : undefined,
        q
          ? sql`(${requests.number} LIKE ${'%' + q + '%'} OR ${requests.hac} LIKE ${'%' + q.toUpperCase() + '%'})`
          : undefined,
        cursor
          ? or(
              lt(requests.updatedAt, cursor.at),
              and(eq(requests.updatedAt, cursor.at), lt(requests.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(requests.updatedAt), desc(requests.id))
    .limit(51);
  const page = rows.slice(0, 50).filter((r) => canSeeRequest(actor, r));
  const last = rows[49];
  return {
    scope,
    scopes,
    items: page.map(toItem),
    nextCursor: rows.length > 50 && last ? encodeCursor(last.updatedAt, last.id) : null,
  };
}

export async function requestDetail(actor: Identity, id: string): Promise<RequestDetail> {
  if (!isId(id)) throw new AppError(404, 'Request tidak ditemukan.');
  const [r] = await db().select().from(requests).where(eq(requests.id, id));
  if (!r || !canSeeRequest(actor, r)) throw new AppError(404, 'Request tidak ditemukan.');
  const images = await db()
    .select({ id: files.id, name: files.originalName })
    .from(files)
    .where(and(eq(files.parentType, 'request'), eq(files.parentId, r.id), eq(files.status, 'attached')));
  const [d] = r.drawingId ? await db().select().from(drawings).where(eq(drawings.id, r.drawingId)) : [];
  const [rev] = d?.currentRevisionId
    ? await db().select().from(revisions).where(eq(revisions.id, d.currentRevisionId))
    : [];
  const role = drawingsRole(actor);
  return {
    ...toItem(r),
    purpose: r.purpose,
    reviewer: r.reviewerId ? { id: r.reviewerId, name: r.reviewerName ?? '' } : null,
    reviewNote: r.reviewNote,
    drafterNote: r.drafterNote,
    closeReason: r.closeReason,
    closedAt: r.closedAt?.toISOString() ?? null,
    version: r.version,
    images,
    drawing: d
      ? { id: d.id, number: d.number, title: d.title, status: d.voidedAt ? 'void' : (rev?.status ?? null) }
      : null,
    can: {
      cancel: r.requesterId === actor.id && r.status === 'pending_review',
      review:
        canDraw(actor, 'request.review') &&
        (r.status === 'pending_review' || r.status === 'drafter_rejected'),
      drafterDecision:
        role === 'drafter' && r.drafterId === actor.id && r.status === 'waiting_drafter_acceptance',
    },
  };
}

/** Tugas request: antrean review untuk leader/admin dan assignment untuk Drafter. */
export async function requestTasks(actor: Identity): Promise<TaskItem[]> {
  const review = canDraw(actor, 'request.review');
  const role = drawingsRole(actor);
  if (!review && role !== 'drafter') return [];
  const rows = await db()
    .select()
    .from(requests)
    .where(
      or(
        review ? inArray(requests.status, ['pending_review', 'drafter_rejected']) : undefined,
        role === 'drafter'
          ? and(eq(requests.status, 'waiting_drafter_acceptance'), eq(requests.drafterId, actor.id))
          : undefined,
      ),
    )
    .orderBy(desc(requests.updatedAt))
    .limit(200);
  return rows.map((r) => ({
    kind: r.status === 'waiting_drafter_acceptance' ? 'request_assignment' : 'request_review',
    key: `request-${r.id}`,
    drawingId: null,
    revisionId: null,
    requestId: r.id,
    number: r.number,
    title: r.description.slice(0, 120),
    revisionNo: null,
    status: r.status,
    statusLabel: requestStatusLabels[r.status as RequestStatus],
    tone: requestStatusTone(r.status as RequestStatus),
    owner: r.requesterName,
    updatedAt: r.updatedAt.toISOString(),
    href: link(r),
  }));
}

/** Gambar referensi request; izin mengikuti request induk. */
export async function requestImage(actor: Identity, fileId: string) {
  if (!isId(fileId)) throw new AppError(404, 'Gambar tidak ditemukan.');
  const [file] = await db().select().from(files).where(eq(files.id, fileId));
  if (!file || file.parentType !== 'request' || file.status !== 'attached' || !file.parentId)
    throw new AppError(404, 'Gambar tidak ditemukan.');
  const [r] = await db().select().from(requests).where(eq(requests.id, file.parentId));
  if (!r || !canSeeRequest(actor, r)) throw new AppError(404, 'Gambar tidak ditemukan.');
  return file;
}
