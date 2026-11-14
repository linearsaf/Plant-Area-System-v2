// Alur approval (PRD §4.1–§4.4, §6.4, K6–K8, Fase 4): Submit, Check + approval plan, Approval L1,
// Final Approval, reject dengan lampiran, siklus, maker-checker, ganti approver, stamp/file issued,
// obsolete, revisi baru, pembatalan revisi dan Tugas saya.
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import {
  AppError,
  approvalDecisionSchema,
  approvalLevels,
  approvalPlanSchema,
  approverRoles,
  canDraw,
  canSeeDrawing,
  canSeeWip,
  cancelRevisionSchema,
  checkDecisionSchema,
  drawingPermissions,
  drawingsPermission,
  drawingsRole,
  drawingsRoleLabels,
  editableRevisionStatuses,
  makerIds,
  newRevisionSchema,
  nextRevisionNo,
  nextStatus,
  submitSchema,
  type ApprovalActionView,
  type ApprovalStep,
  type DrawingDetail,
  type Identity,
  type RevisionStatus,
  type TaskItem,
  type TaskKind,
  type WorkflowAvailability,
} from '@plant/contracts';
import { approvalActions, approvalSteps, drawings, files, revisions } from './schema';
import {
  conflictNumber,
  drawingDetailBase,
  facts,
  type DirectoryPerson,
  type DrawingRow,
  type RevisionRow,
} from './drawings';
import { db, idempotent, lockDrawing, parse, writeAudit, type Tx } from './support';
import { serialPdfJob, stampPdf, type StampSlot } from './pdf';
import { storageKey, withStorage } from './storage';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Directory = () => Promise<DirectoryPerson[]>;
const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v);

// ───────────────────────── Helpers ─────────────────────────

/** Mengunci drawing (akar agregat) lalu revisi; memastikan revisi adalah revisi kerja yang berlaku. */
async function lockRevision(tx: Tx, actor: Identity, revisionId: string, expectedVersion: number) {
  if (!isId(revisionId)) throw new AppError(404, 'Revisi tidak ditemukan.');
  const [peek] = await tx
    .select({ drawingId: revisions.drawingId })
    .from(revisions)
    .where(eq(revisions.id, revisionId));
  if (!peek) throw new AppError(404, 'Revisi tidak ditemukan.');
  const d = await lockDrawing(
    tx,
    peek.drawingId,
    expectedVersion,
    (row) => canSeeDrawing(actor, facts(row)) && canSeeWip(actor, row),
  );
  const [rev] = await tx.select().from(revisions).where(eq(revisions.id, revisionId)).for('update');
  if (d.voidedAt) throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
  if (d.currentRevisionId !== rev.id)
    throw new AppError(409, 'Revisi ini bukan revisi yang sedang dikerjakan.', 'INVALID_TRANSITION');
  return { d, rev };
}
function requireNotMaker(actor: Identity, d: DrawingRow, rev: RevisionRow) {
  if (makerIds(d, rev).has(actor.id))
    throw new AppError(
      403,
      'Pembuat, owner atau pengirim revisi ini tidak dapat memutus Check atau Approval.',
      'MAKER_CHECKER',
    );
}
async function steps(executor: Tx | ReturnType<typeof db>, revisionId: string, lock = false) {
  const query = executor.select().from(approvalSteps).where(eq(approvalSteps.revisionId, revisionId));
  return lock ? query.for('update') : query;
}
/** Kandidat approver: pengguna aktif ber-role sesuai level dan bukan maker revisi ini. */
async function requireCandidate(
  directory: Directory,
  level: 1 | 2,
  personId: string,
  maker: Set<string>,
): Promise<DirectoryPerson> {
  const person = (await directory()).find(
    (p) => p.id === personId && (approverRoles[level] as readonly string[]).includes(p.role),
  );
  const label = level === 1 ? 'Approver L1' : 'Final Approval';
  if (!person)
    throw new AppError(
      400,
      `${label} harus pengguna aktif ber-role ${level === 1 ? 'Approver L1 atau Admin' : 'Head atau Admin'}.`,
      'VALIDATION',
    );
  if (maker.has(person.id))
    throw new AppError(403, `${person.name} terkena maker-checker dan tidak dapat dipilih.`, 'MAKER_CHECKER');
  return person;
}
async function upsertStep(
  tx: Tx,
  actor: Identity,
  revisionId: string,
  level: 1 | 2,
  person: DirectoryPerson,
  at: Date,
) {
  await tx
    .delete(approvalSteps)
    .where(and(eq(approvalSteps.revisionId, revisionId), eq(approvalSteps.level, level)));
  await tx.insert(approvalSteps).values({
    id: randomUUID(),
    revisionId,
    level,
    assigneeId: person.id,
    assigneeName: person.name,
    assignedById: actor.id,
    assignedByName: actor.name,
    assignedAt: at,
  });
}
/** Menautkan gambar staged milik actor sebagai lampiran keputusan (maks. 3, JPEG/PNG/WebP). */
async function attachImages(tx: Tx, actor: Identity, ids: string[], actionId: string, at: Date) {
  if (!ids.length) return;
  if (new Set(ids).size !== ids.length) throw new AppError(400, 'Lampiran duplikat.', 'VALIDATION');
  const rows = await tx.select().from(files).where(inArray(files.id, ids)).for('update');
  if (
    rows.length !== ids.length ||
    rows.some((f) => f.ownerId !== actor.id || f.status !== 'staged' || f.kind !== 'image')
  )
    throw new AppError(
      400,
      'Lampiran tidak ditemukan atau sudah dipakai. Unggah ulang gambar.',
      'FILE_INVALID',
    );
  await tx
    .update(files)
    .set({
      status: 'attached',
      purpose: 'attachment',
      parentType: 'action',
      parentId: actionId,
      attachedAt: at,
    })
    .where(inArray(files.id, ids));
}
async function bump(tx: Tx, d: DrawingRow, set: Partial<DrawingRow>, at: Date) {
  await tx
    .update(drawings)
    .set({ ...set, version: d.version + 1, updatedAt: at })
    .where(eq(drawings.id, d.id));
  return d.version + 1;
}
const done = <T extends object>(d: DrawingRow, body: T, status = 200) => ({ status, body, targetId: d.id });

// ───────────────────────── Submit ─────────────────────────

export async function submitRevision(
  actor: Identity,
  revisionId: string,
  input: unknown,
  key: string | null,
) {
  if (!canDraw(actor, 'drawing.edit_submit')) throw new AppError(403, 'Anda tidak dapat submit drawing.');
  const data = parse(submitSchema, input);
  return idempotent(actor, key, `revision.submit:${revisionId}`, data, async (tx) => {
    const { d, rev } = await lockRevision(tx, actor, revisionId, data.expectedVersion);
    if (!drawingPermissions(actor, { ...facts(d), currentStatus: rev.status as RevisionStatus }).edit)
      throw new AppError(403, 'Hanya owner atau Admin yang dapat submit revisi ini.');
    const to = nextStatus(rev.status as RevisionStatus, 'submit');
    const missing = [
      !d.number && 'Drawing Number',
      !d.title && 'Drawing Name',
      !d.disciplineId && 'Discipline',
    ].filter(Boolean);
    if (missing.length)
      throw new AppError(400, `Lengkapi ${missing.join(', ')} sebelum Submit.`, 'VALIDATION');
    if (!rev.workingFileId)
      throw new AppError(400, 'File PDF wajib diunggah sebelum Submit.', 'FILE_REQUIRED');
    const now = new Date(),
      cycle = rev.cycle + 1;
    await tx
      .update(revisions)
      .set({
        status: to,
        cycle,
        submittedById: actor.id,
        submittedByName: actor.name,
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(revisions.id, rev.id));
    const version = await bump(tx, d, { workStatus: to, everSubmitted: true }, now);
    await writeAudit(
      tx,
      actor,
      'revision.submitted',
      'revision',
      rev.id,
      { cycle, revisionNo: rev.revisionNo, fileId: rev.workingFileId },
      d.id,
      now,
    );
    return done(d, { id: rev.id, status: to, cycle, version });
  });
}

// ───────────────────────── Check (level 0) ─────────────────────────

export async function checkRevision(
  actor: Identity,
  revisionId: string,
  input: unknown,
  key: string | null,
  directory: Directory,
) {
  if (!canDraw(actor, 'revision.check')) throw new AppError(403, 'Anda tidak dapat melakukan Check.');
  const data = parse(checkDecisionSchema, input);
  return idempotent(actor, key, `revision.check:${revisionId}`, data, async (tx) => {
    const { d, rev } = await lockRevision(tx, actor, revisionId, data.expectedVersion);
    requireNotMaker(actor, d, rev);
    const approve = data.decision === 'approve';
    const to = nextStatus(rev.status as RevisionStatus, approve ? 'check.approve' : 'check.reject');
    const maker = makerIds(d, rev);
    const now = new Date(),
      actionId = randomUUID();
    let plan: { l1?: string; l2?: string | null } = {};
    if (approve) {
      const l1 = await requireCandidate(directory, 1, data.approverL1Id!, maker);
      const l2 = data.approverL2Id ? await requireCandidate(directory, 2, data.approverL2Id, maker) : null;
      // A fresh plan per cycle: previous assignments are replaced.
      await tx.delete(approvalSteps).where(eq(approvalSteps.revisionId, rev.id));
      await upsertStep(tx, actor, rev.id, 1, l1, now);
      if (l2) await upsertStep(tx, actor, rev.id, 2, l2, now);
      plan = { l1: l1.name, l2: l2?.name ?? null };
    }
    await tx.insert(approvalActions).values({
      id: actionId,
      revisionId: rev.id,
      drawingId: d.id,
      cycle: rev.cycle,
      level: 0,
      decision: approve ? 'approved' : 'rejected',
      note: data.note,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: drawingsRole(actor) ?? '',
      reviewedFileId: rev.workingFileId,
      createdAt: now,
    });
    await attachImages(tx, actor, data.attachmentIds, actionId, now);
    await tx.update(revisions).set({ status: to, updatedAt: now }).where(eq(revisions.id, rev.id));
    const version = await bump(tx, d, { workStatus: to }, now);
    await writeAudit(
      tx,
      actor,
      approve ? 'revision.check_approved' : 'revision.check_rejected',
      'revision',
      rev.id,
      { cycle: rev.cycle, note: data.note, attachments: data.attachmentIds.length, ...plan },
      d.id,
      now,
    );
    return done(d, { id: rev.id, status: to, version });
  });
}

// ───────────────────────── Approval L1 / Final Approval ─────────────────────────

type Issued = {
  fileId: string;
  key: string;
  size: number;
  sha256: string;
  pageCount: number | null;
  at: Date;
  cycle: number;
  workingFileId: string;
} | null;

/** Pemeriksaan izin keputusan approval yang sama di luar dan di dalam transaksi. */
function requireApprover(
  actor: Identity,
  level: 1 | 2,
  d: DrawingRow,
  rev: RevisionRow,
  plan: (typeof approvalSteps.$inferSelect)[],
) {
  const expected: RevisionStatus = level === 1 ? 'waiting_approval_1' : 'waiting_approval_2';
  if (rev.status !== expected)
    throw new AppError(409, 'Status revisi sudah berubah atau aksi ini tidak berlaku.', 'INVALID_TRANSITION');
  const step = plan.find((s) => s.level === level);
  const permission = drawingsPermission(actor, level === 1 ? 'revision.approve_l1' : 'revision.approve_l2');
  if (!step || step.assigneeId !== actor.id || permission === false)
    throw new AppError(403, 'Hanya assignee revisi ini yang dapat memutus tahap ini.', 'NOT_ASSIGNEE');
  requireNotMaker(actor, d, rev);
  return step;
}

/** Slot stamp dari keputusan siklus berjalan (Check, L1, Final) ditambah keputusan yang sedang dibuat. */
async function stampSlots(rev: RevisionRow, level: 1 | 2, actor: Identity, at: Date): Promise<StampSlot[]> {
  const actions = await db()
    .select()
    .from(approvalActions)
    .where(and(eq(approvalActions.revisionId, rev.id), eq(approvalActions.cycle, rev.cycle)));
  const slots: StampSlot[] = [];
  for (const l of [0, 1] as const) {
    if (l >= level) break;
    const a = actions.find((x) => x.level === l && x.decision === 'approved');
    if (!a) throw new AppError(409, 'Keputusan tahap sebelumnya tidak lengkap.', 'INVALID_TRANSITION');
    slots.push({
      title: approvalLevels[l],
      name: a.actorName,
      role: drawingsRoleLabels[a.actorRole as keyof typeof drawingsRoleLabels] ?? a.actorRole,
      decidedAt: a.createdAt,
    });
  }
  const role = drawingsRole(actor);
  slots.push({
    title: approvalLevels[level],
    name: actor.name,
    role: role ? drawingsRoleLabels[role] : '',
    decidedAt: at,
  });
  return slots;
}

/** Membuat file issued berstempel di storage sebelum transaksi (PRD §6.4). File asli tidak diubah. */
async function prepareIssued(
  actor: Identity,
  level: 1 | 2,
  revisionId: string,
  approve: boolean,
): Promise<Issued> {
  if (!approve) return null;
  const [rev] = await db().select().from(revisions).where(eq(revisions.id, revisionId));
  if (!rev) throw new AppError(404, 'Revisi tidak ditemukan.');
  const [d] = await db().select().from(drawings).where(eq(drawings.id, rev.drawingId));
  if (!d || !canSeeDrawing(actor, facts(d))) throw new AppError(404, 'Revisi tidak ditemukan.');
  const plan = await steps(db(), rev.id);
  requireApprover(actor, level, d, rev, plan);
  const completes = level === 2 || !plan.some((s) => s.level === 2);
  // Every revision completed through approval is stamped, including revisions after a legacy upload.
  if (!completes || !rev.workingFileId) return null;
  const [working] = await db().select().from(files).where(eq(files.id, rev.workingFileId));
  if (!working) throw new AppError(409, 'File kerja tidak ditemukan.', 'FILE_REQUIRED');
  const at = new Date();
  const slots = await stampSlots(rev, level, actor, at);
  const source = await withStorage(async (s) => {
    const object = await s.get(working.storageKey);
    return Buffer.from(await new Response(object.body).arrayBuffer());
  });
  if (createHash('sha256').update(source).digest('hex') !== working.sha256)
    throw new AppError(503, 'File kerja di storage tidak sesuai catatan.', 'STORAGE_UNAVAILABLE');
  const issued = Buffer.from(await serialPdfJob(() => stampPdf(source, slots)));
  const fileId = randomUUID(),
    key = storageKey(fileId, 'pdf', at);
  const directory = await mkdtemp(join(tmpdir(), 'plant-issued-'));
  try {
    const path = join(directory, 'issued.pdf');
    await writeFile(path, issued);
    const sha256 = createHash('sha256').update(issued).digest('hex');
    await withStorage((s) =>
      s.put(key, path, { size: issued.length, contentType: 'application/pdf', sha256 }),
    );
    return {
      fileId,
      key,
      size: issued.length,
      sha256,
      pageCount: working.pageCount,
      at,
      cycle: rev.cycle,
      workingFileId: working.id,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function decideApproval(
  actor: Identity,
  level: 1 | 2,
  revisionId: string,
  input: unknown,
  key: string | null,
) {
  if (!canDraw(actor, level === 1 ? 'revision.approve_l1' : 'revision.approve_l2'))
    throw new AppError(403, 'Anda tidak dapat memutus tahap approval ini.', 'NOT_ASSIGNEE');
  const data = parse(approvalDecisionSchema, input);
  const approve = data.decision === 'approve';
  return idempotent<object, Issued>(
    actor,
    key,
    `revision.approve_l${level}:${revisionId}`,
    data,
    async (tx, issued) => {
      const { d, rev } = await lockRevision(tx, actor, revisionId, data.expectedVersion);
      const plan = await steps(tx, rev.id, true);
      requireApprover(actor, level, d, rev, plan);
      const hasL2 = plan.some((s) => s.level === 2);
      const to = nextStatus(
        rev.status as RevisionStatus,
        approve ? (level === 1 ? 'l1.approve' : 'l2.approve') : level === 1 ? 'l1.reject' : 'l2.reject',
        hasL2,
      );
      const completed = to === 'completed';
      if (completed) {
        // The stamp was built outside the transaction; it must still match the locked state.
        if (!issued || issued.cycle !== rev.cycle || issued.workingFileId !== rev.workingFileId)
          throw new AppError(409, 'Data revisi berubah saat stamp dibuat. Coba lagi.', 'VERSION_CONFLICT');
      }
      const now = issued?.at ?? new Date(),
        actionId = randomUUID();
      await tx.insert(approvalActions).values({
        id: actionId,
        revisionId: rev.id,
        drawingId: d.id,
        cycle: rev.cycle,
        level,
        decision: approve ? 'approved' : 'rejected',
        note: data.note,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: drawingsRole(actor) ?? '',
        reviewedFileId: rev.workingFileId,
        createdAt: now,
      });
      await attachImages(tx, actor, data.attachmentIds, actionId, now);
      let version: number;
      if (completed) {
        if (issued)
          await tx.insert(files).values({
            id: issued.fileId,
            kind: 'pdf',
            purpose: 'issued',
            storageKey: issued.key,
            originalName: `${d.number ?? 'Drawing'}_Rev-${rev.revisionNo}.pdf`,
            mime: 'application/pdf',
            size: issued.size,
            sha256: issued.sha256,
            pageCount: issued.pageCount,
            status: 'attached',
            ownerId: actor.id,
            ownerName: actor.name,
            parentType: 'revision',
            parentId: rev.id,
            createdAt: now,
            attachedAt: now,
          });
        await tx
          .update(revisions)
          .set({
            status: 'completed',
            completedAt: now,
            issuedFileId: issued?.fileId ?? null,
            updatedAt: now,
          })
          .where(eq(revisions.id, rev.id));
        // K7: the previous Final Drawing stays valid until now; it becomes Obsolete in the same transaction.
        if (d.releasedRevisionId && d.releasedRevisionId !== rev.id)
          await tx
            .update(revisions)
            .set({ status: 'obsolete', obsoleteAt: now, updatedAt: now })
            .where(and(eq(revisions.id, d.releasedRevisionId), eq(revisions.status, 'completed')));
        version = await bump(
          tx,
          d,
          { workStatus: 'completed', releasedRevisionId: rev.id, currentRevisionId: rev.id, releasedAt: now },
          now,
        );
      } else {
        await tx.update(revisions).set({ status: to, updatedAt: now }).where(eq(revisions.id, rev.id));
        version = await bump(tx, d, { workStatus: to }, now);
      }
      await writeAudit(
        tx,
        actor,
        `revision.l${level}_${approve ? 'approved' : 'rejected'}`,
        'revision',
        rev.id,
        {
          cycle: rev.cycle,
          note: data.note,
          attachments: data.attachmentIds.length,
          ...(completed
            ? { completed: true, issuedFileId: issued?.fileId ?? null, obsoleted: d.releasedRevisionId }
            : {}),
        },
        d.id,
        now,
      );
      return done(d, { id: rev.id, status: to, version });
    },
    {
      prepare: () => prepareIssued(actor, level, revisionId, approve),
      rollback: async (issued) => {
        if (issued) await withStorage((s) => s.delete(issued.key));
      },
    },
  );
}

// ───────────────────────── Ganti approver ─────────────────────────

export async function updateApprovalPlan(
  actor: Identity,
  revisionId: string,
  input: unknown,
  directory: Directory,
) {
  if (!canDraw(actor, 'revision.reassign_approver'))
    throw new AppError(403, 'Anda tidak dapat mengganti approver.');
  const data = parse(approvalPlanSchema, input);
  return db().transaction(async (tx) => {
    const { d, rev } = await lockRevision(tx, actor, revisionId, data.expectedVersion);
    const status = rev.status as RevisionStatus;
    if (status !== 'waiting_approval_1' && status !== 'waiting_approval_2')
      throw new AppError(
        409,
        'Approver hanya dapat diganti selama revisi menunggu approval.',
        'INVALID_TRANSITION',
      );
    const maker = makerIds(d, rev);
    const now = new Date();
    const changes: Record<string, unknown> = {};
    const plan = await steps(tx, rev.id, true);
    if (data.approverL1Id !== undefined) {
      if (status !== 'waiting_approval_1')
        throw new AppError(409, 'Approver L1 tidak dapat diganti setelah L1 diputus.', 'INVALID_TRANSITION');
      const person = await requireCandidate(directory, 1, data.approverL1Id, maker);
      changes.l1 = { from: plan.find((s) => s.level === 1)?.assigneeName ?? null, to: person.name };
      await upsertStep(tx, actor, rev.id, 1, person, now);
    }
    if (data.approverL2Id !== undefined) {
      if (data.approverL2Id === null) {
        if (status === 'waiting_approval_2')
          throw new AppError(
            409,
            'Final Approval tidak dapat dikosongkan saat revisi menunggu Final Approval.',
            'INVALID_TRANSITION',
          );
        changes.l2 = { from: plan.find((s) => s.level === 2)?.assigneeName ?? null, to: null };
        await tx
          .delete(approvalSteps)
          .where(and(eq(approvalSteps.revisionId, rev.id), eq(approvalSteps.level, 2)));
      } else {
        const person = await requireCandidate(directory, 2, data.approverL2Id, maker);
        changes.l2 = { from: plan.find((s) => s.level === 2)?.assigneeName ?? null, to: person.name };
        await upsertStep(tx, actor, rev.id, 2, person, now);
      }
    }
    const version = await bump(tx, d, {}, now);
    await writeAudit(tx, actor, 'revision.approval_plan_changed', 'revision', rev.id, changes, d.id, now);
    return { id: rev.id, version };
  });
}

// ───────────────────────── Revisi baru dan pembatalan ─────────────────────────

export async function createRevision(actor: Identity, drawingId: string, input: unknown, key: string | null) {
  if (!canDraw(actor, 'revision.create')) throw new AppError(403, 'Anda tidak dapat membuat revisi baru.');
  const data = parse(newRevisionSchema, input);
  try {
    return await idempotent(actor, key, `revision.create:${drawingId}`, data, async (tx) => {
      const d = await lockDrawing(tx, drawingId, data.expectedVersion, (row) =>
        canSeeDrawing(actor, facts(row)),
      );
      const value = drawingsPermission(actor, 'revision.create');
      if (!(value === true || (value === 'own' && d.ownerId === actor.id)))
        throw new AppError(403, 'Hanya owner atau Admin yang dapat membuat revisi baru.');
      if (d.voidedAt) throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
      if (!d.releasedRevisionId || d.currentRevisionId !== d.releasedRevisionId)
        throw new AppError(
          409,
          'Revisi baru hanya dibuat dari Final Drawing tanpa revisi aktif.',
          'INVALID_TRANSITION',
        );
      const [released] = await tx.select().from(revisions).where(eq(revisions.id, d.releasedRevisionId));
      const now = new Date(),
        id = randomUUID(),
        revisionNo = data.revisionNo ?? nextRevisionNo(released.revisionNo);
      await tx.insert(revisions).values({
        id,
        drawingId: d.id,
        revisionNo,
        status: 'draft',
        changeNote: data.changeNote,
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: now,
        updatedAt: now,
      });
      const version = await bump(tx, d, { currentRevisionId: id, workStatus: 'draft' }, now);
      await writeAudit(
        tx,
        actor,
        'revision.created',
        'revision',
        id,
        { revisionNo, from: released.revisionNo },
        d.id,
        now,
      );
      return { status: 201, body: { id, revisionNo, version }, targetId: d.id };
    });
  } catch (e) {
    throw conflictNumber(e);
  }
}

export async function cancelRevision(
  actor: Identity,
  revisionId: string,
  input: unknown,
  key: string | null,
) {
  if (!canDraw(actor, 'revision.cancel')) throw new AppError(403, 'Anda tidak dapat membatalkan revisi.');
  const data = parse(cancelRevisionSchema, input);
  return idempotent(actor, key, `revision.cancel:${revisionId}`, data, async (tx) => {
    const { d, rev } = await lockRevision(tx, actor, revisionId, data.expectedVersion);
    const value = drawingsPermission(actor, 'revision.cancel');
    if (!(value === true || (value === 'own' && d.ownerId === actor.id)))
      throw new AppError(403, 'Hanya owner atau Admin yang dapat membatalkan revisi.');
    if (!d.releasedRevisionId || d.releasedRevisionId === rev.id)
      throw new AppError(
        409,
        'Hanya revisi lanjutan dari Final Drawing yang dapat dibatalkan. Gunakan void untuk drawing.',
        'INVALID_TRANSITION',
      );
    nextStatus(rev.status as RevisionStatus, 'cancel');
    const now = new Date();
    await tx
      .update(revisions)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelReason: data.reason,
        cancelledById: actor.id,
        cancelledByName: actor.name,
        updatedAt: now,
      })
      .where(eq(revisions.id, rev.id));
    await tx.delete(approvalSteps).where(eq(approvalSteps.revisionId, rev.id));
    const version = await bump(
      tx,
      d,
      { currentRevisionId: d.releasedRevisionId, workStatus: 'completed' },
      now,
    );
    await writeAudit(
      tx,
      actor,
      'revision.cancelled',
      'revision',
      rev.id,
      { reason: data.reason, revisionNo: rev.revisionNo },
      d.id,
      now,
    );
    return done(d, { id: rev.id, status: 'cancelled', version });
  });
}

// ───────────────────────── Baca: detail, Tugas saya, lampiran ─────────────────────────

const inactiveAssignee = (people: DirectoryPerson[] | null, s: typeof approvalSteps.$inferSelect) =>
  !!people &&
  !people.some(
    (p) => p.id === s.assigneeId && (approverRoles[s.level as 1 | 2] as readonly string[]).includes(p.role),
  );

/** Detail drawing lengkap dengan approval plan, riwayat keputusan dan aksi yang tersedia. */
export async function drawingDetail(
  actor: Identity,
  id: string,
  people: DirectoryPerson[] | null = null,
): Promise<DrawingDetail> {
  const { detail, row: d, current: rev } = await drawingDetailBase(actor, id);
  const none: WorkflowAvailability = {
    submit: false,
    check: false,
    approveL1: false,
    approveL2: false,
    reassign: false,
    newRevision: false,
    cancelRevision: false,
    makerBlocked: false,
  };
  if (!detail.permissions.seeWip) return { ...detail, workflow: { steps: [], actions: [], available: none } };
  const plan = rev ? await steps(db(), rev.id) : [];
  const actionRows = await db()
    .select()
    .from(approvalActions)
    .where(eq(approvalActions.drawingId, d.id))
    .orderBy(desc(approvalActions.createdAt));
  const attachmentRows = actionRows.length
    ? await db()
        .select({ id: files.id, name: files.originalName, parentId: files.parentId })
        .from(files)
        .where(
          and(
            eq(files.parentType, 'action'),
            inArray(
              files.parentId,
              actionRows.map((a) => a.id),
            ),
            eq(files.status, 'attached'),
          ),
        )
    : [];
  const status = (rev?.status ?? null) as RevisionStatus | null;
  const cycleActions = rev ? actionRows.filter((a) => a.revisionId === rev.id && a.cycle === rev.cycle) : [];
  const stepsView: ApprovalStep[] = plan
    .sort((a, b) => a.level - b.level)
    .map((s) => ({
      level: s.level as 1 | 2,
      assignee: { id: s.assigneeId, name: s.assigneeName },
      assignedBy: { id: s.assignedById, name: s.assignedByName },
      assignedAt: s.assignedAt.toISOString(),
      inactive: inactiveAssignee(people, s),
      decided: cycleActions.some((a) => a.level === s.level),
    }));
  const actions: ApprovalActionView[] = actionRows.map((a) => ({
    id: a.id,
    cycle: a.cycle,
    level: a.level as 0 | 1 | 2,
    decision: a.decision as 'approved' | 'rejected',
    note: a.note,
    actor: { id: a.actorId, name: a.actorName },
    actorRole: a.actorRole,
    attachments: attachmentRows.filter((f) => f.parentId === a.id).map((f) => ({ id: f.id, name: f.name })),
    createdAt: a.createdAt.toISOString(),
  }));
  const maker = rev ? makerIds(d, rev).has(actor.id) : false;
  const isWorking = !!rev && rev.id !== d.releasedRevisionId && !d.voidedAt;
  const l1 = plan.find((s) => s.level === 1),
    l2 = plan.find((s) => s.level === 2);
  const ownerOrAdmin = (action: 'revision.create' | 'revision.cancel') => {
    const v = drawingsPermission(actor, action);
    return v === true || (v === 'own' && d.ownerId === actor.id);
  };
  const decider =
    (status === 'waiting_check' && canDraw(actor, 'revision.check')) ||
    (status === 'waiting_approval_1' && l1?.assigneeId === actor.id) ||
    (status === 'waiting_approval_2' && l2?.assigneeId === actor.id);
  const available: WorkflowAvailability = {
    submit: isWorking && detail.permissions.edit && !!status && editableRevisionStatuses.includes(status),
    check: isWorking && status === 'waiting_check' && canDraw(actor, 'revision.check') && !maker,
    approveL1:
      isWorking &&
      status === 'waiting_approval_1' &&
      l1?.assigneeId === actor.id &&
      canDraw(actor, 'revision.approve_l1') &&
      !maker,
    approveL2:
      isWorking &&
      status === 'waiting_approval_2' &&
      l2?.assigneeId === actor.id &&
      canDraw(actor, 'revision.approve_l2') &&
      !maker,
    reassign:
      isWorking &&
      (status === 'waiting_approval_1' || status === 'waiting_approval_2') &&
      canDraw(actor, 'revision.reassign_approver'),
    newRevision:
      !d.voidedAt &&
      !!d.releasedRevisionId &&
      d.currentRevisionId === d.releasedRevisionId &&
      ownerOrAdmin('revision.create'),
    cancelRevision:
      isWorking &&
      !!d.releasedRevisionId &&
      !!status &&
      editableRevisionStatuses.includes(status) &&
      ownerOrAdmin('revision.cancel'),
    makerBlocked: isWorking && maker && decider,
  };
  return { ...detail, workflow: { steps: stepsView, actions, available } };
}

const taskOrder: Record<TaskKind, number> = {
  rejected: 0,
  draft: 1,
  waiting_check: 2,
  approval_l1: 3,
  approval_l2: 4,
  inactive_approver: 5,
};
const rejectedOrder: Partial<Record<RevisionStatus, number>> = {
  approval_2_rejected: 0,
  approval_1_rejected: 1,
  check_rejected: 2,
};
/** Tugas saya dihitung dari keadaan data saat dibuka, sehingga tidak pernah basi (PRD §4.8). */
export async function listTasks(actor: Identity, people: DirectoryPerson[] | null): Promise<TaskItem[]> {
  if (!canDraw(actor, 'tasks')) return [];
  const rows = await db()
    .select({ d: drawings, r: revisions })
    .from(drawings)
    .innerJoin(revisions, eq(revisions.id, drawings.currentRevisionId))
    .where(
      and(
        isNull(drawings.voidedAt),
        or(isNull(drawings.releasedRevisionId), ne(drawings.currentRevisionId, drawings.releasedRevisionId)),
      ),
    );
  const ids = rows.map((x) => x.r.id);
  const plan = ids.length
    ? await db().select().from(approvalSteps).where(inArray(approvalSteps.revisionId, ids))
    : [];
  const tasks: TaskItem[] = [];
  const push = (kind: TaskKind, d: DrawingRow, r: RevisionRow) =>
    tasks.push({
      kind,
      drawingId: d.id,
      revisionId: r.id,
      number: d.number,
      title: d.title,
      revisionNo: r.revisionNo,
      status: r.status as RevisionStatus,
      owner: d.ownerName,
      updatedAt: r.updatedAt.toISOString(),
      href:
        kind === 'rejected' || kind === 'draft' || kind === 'inactive_approver'
          ? `/drawings/library/${d.id}`
          : `/drawings/library/${d.id}/review`,
    });
  const edit = drawingsPermission(actor, 'drawing.edit_submit');
  for (const { d, r } of rows) {
    const status = r.status as RevisionStatus;
    const own = edit === true ? d.ownerId === actor.id : edit === 'own' && d.ownerId === actor.id;
    if (own && editableRevisionStatuses.includes(status))
      push(status === 'draft' ? 'draft' : 'rejected', d, r);
    const maker = makerIds(d, r).has(actor.id);
    if (status === 'waiting_check' && canDraw(actor, 'revision.check') && !maker) push('waiting_check', d, r);
    const revisionPlan = plan.filter((s) => s.revisionId === r.id);
    const level = status === 'waiting_approval_1' ? 1 : status === 'waiting_approval_2' ? 2 : 0;
    const step = revisionPlan.find((s) => s.level === level);
    if (
      step &&
      step.assigneeId === actor.id &&
      !maker &&
      canDraw(actor, level === 1 ? 'revision.approve_l1' : 'revision.approve_l2')
    )
      push(level === 1 ? 'approval_l1' : 'approval_l2', d, r);
    if (
      level &&
      canDraw(actor, 'revision.reassign_approver') &&
      revisionPlan.some((s) => s.level >= level && inactiveAssignee(people, s))
    )
      push('inactive_approver', d, r);
  }
  return tasks.sort(
    (a, b) =>
      taskOrder[a.kind] - taskOrder[b.kind] ||
      (rejectedOrder[a.status] ?? 9) - (rejectedOrder[b.status] ?? 9) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Lampiran keputusan (gambar) dengan izin mengikuti induknya: hanya yang boleh melihat data dalam proses. */
export async function attachmentFile(actor: Identity, id: string) {
  if (!canDraw(actor, 'read') || !isId(id)) throw new AppError(404, 'Lampiran tidak ditemukan.');
  const [file] = await db().select().from(files).where(eq(files.id, id));
  if (!file || file.parentType !== 'action' || file.status !== 'attached' || !file.parentId)
    throw new AppError(404, 'Lampiran tidak ditemukan.');
  const [action] = await db().select().from(approvalActions).where(eq(approvalActions.id, file.parentId));
  const [d] = action ? await db().select().from(drawings).where(eq(drawings.id, action.drawingId)) : [];
  if (!d || !canSeeDrawing(actor, facts(d)) || !canSeeWip(actor, d))
    throw new AppError(404, 'Lampiran tidak ditemukan.');
  return file;
}

/** Kandidat approver level 1/2 untuk revisi: role sesuai, aktif, dan bukan maker (K8). */
export async function approverCandidates(
  actor: Identity,
  revisionId: string,
  level: 1 | 2,
  people: DirectoryPerson[],
) {
  if (!canDraw(actor, 'revision.check') && !canDraw(actor, 'revision.reassign_approver'))
    throw new AppError(403, 'Daftar approver tidak tersedia untuk role Anda.');
  if (!isId(revisionId)) throw new AppError(404, 'Revisi tidak ditemukan.');
  const [rev] = await db().select().from(revisions).where(eq(revisions.id, revisionId));
  const [d] = rev ? await db().select().from(drawings).where(eq(drawings.id, rev.drawingId)) : [];
  if (!rev || !d || !canSeeDrawing(actor, facts(d))) throw new AppError(404, 'Revisi tidak ditemukan.');
  const maker = makerIds(d, rev);
  return people.filter(
    (p) => (approverRoles[level] as readonly string[]).includes(p.role) && !maker.has(p.id),
  );
}
