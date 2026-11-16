// Drawing inti (PRD §4.4–§4.7, §5, Fase 3): Create Drawing, edit draft, Upload Old Drawing,
// koreksi admin, void, alih owner, Library, detail, jejak aktivitas dan penyajian file revisi.
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import {
  AppError,
  canDraw,
  canSeeDrawing,
  canSeeRevision,
  canSeeWip,
  cleanOtherHacs,
  drawingCreateSchema,
  drawingFileName,
  drawingMetadataFields,
  drawingPermissions,
  drawingUpdateSchema,
  drawingsRole,
  editableRevisionStatuses,
  legacyCreateSchema,
  libraryTabs,
  normalizeHac,
  revisionStatuses,
  transferOwnerSchema,
  voidSchema,
  type DrawingDetail,
  type DrawingListItem,
  type DrawingPage,
  type Identity,
  type LibraryTab,
  type RevisionStatus,
  type RevisionSummary,
  type TimelineEntry,
} from '@plant/contracts';
import { requireActiveMaster } from './masters';
import { audit, disciplines, drawingHacs, drawings, files, revisions } from './schema';
import {
  db,
  decodeCursor,
  encodeCursor,
  idempotent,
  iso,
  likeEscape,
  lockDrawing,
  mysqlCode,
  mysqlMessage,
  parse,
  wibDayStart,
  writeAudit,
  type Tx,
} from './support';
import { withStorage } from './storage';
import { closeRequestForDrawing } from './requests';

export type DirectoryPerson = { id: string; name: string; position: string; role: string };
export type DrawingRow = typeof drawings.$inferSelect;
export type RevisionRow = typeof revisions.$inferSelect;

export const facts = (d: DrawingRow) => ({
  ownerId: d.ownerId,
  voided: !!d.voidedAt,
  released: !!d.releasedRevisionId,
  everSubmitted: d.everSubmitted,
  releasedRevisionId: d.releasedRevisionId,
});
export const conflictNumber = (e: unknown) => {
  if (mysqlCode(e) !== 'ER_DUP_ENTRY') return e;
  const message = mysqlMessage(e);
  if (message.includes('drawings_number_active_uq'))
    return new AppError(409, 'Drawing Number sudah dipakai drawing lain yang aktif.', 'DUPLICATE_NUMBER');
  if (message.includes('drawing_revisions_no_uq'))
    return new AppError(409, 'Nomor revisi sudah dipakai pada drawing ini.', 'DUPLICATE_REVISION');
  return e;
};

/** Mengganti seluruh HAC lain sebuah drawing; urutan isian dipertahankan. */
async function replaceOtherHacs(tx: Tx, drawingId: string, list: readonly string[]) {
  await tx.delete(drawingHacs).where(eq(drawingHacs.drawingId, drawingId));
  if (list.length)
    await tx.insert(drawingHacs).values(list.map((hac, position) => ({ drawingId, hac, position })));
}

/** HAC lain per drawing, urut seperti saat diisi. */
export async function otherHacsOf(ids: readonly string[], executor: Pick<Tx, 'select'> = db()) {
  const result = new Map<string, string[]>();
  if (!ids.length) return result;
  const rows = await executor
    .select()
    .from(drawingHacs)
    .where(inArray(drawingHacs.drawingId, [...ids]))
    .orderBy(asc(drawingHacs.drawingId), asc(drawingHacs.position));
  for (const row of rows) result.set(row.drawingId, [...(result.get(row.drawingId) ?? []), row.hac]);
  return result;
}

/** Cocok bila salah satu HAC lain drawing memenuhi pola LIKE. */
export const otherHacLike = (pattern: string) =>
  sql`EXISTS (SELECT 1 FROM drawing_hacs dh WHERE dh.drawing_id = drawings.id AND dh.hac LIKE ${pattern})`;

/** Menautkan file staged milik actor ke revisi sebagai file kerja. */
async function attachWorkingFile(tx: Tx, actor: Identity, fileId: string, revisionId: string, at: Date) {
  const [file] = await tx.select().from(files).where(eq(files.id, fileId)).for('update');
  if (!file || file.ownerId !== actor.id || file.status !== 'staged' || file.kind !== 'pdf')
    throw new AppError(
      400,
      'File PDF tidak ditemukan atau sudah dipakai. Unggah ulang file lalu coba lagi.',
      'FILE_INVALID',
    );
  await tx
    .update(files)
    .set({
      status: 'attached',
      purpose: 'working',
      parentType: 'revision',
      parentId: revisionId,
      attachedAt: at,
    })
    .where(eq(files.id, fileId));
  return file;
}

// ───────────────────────── Mutasi ─────────────────────────

export async function createDrawing(actor: Identity, input: unknown, key: string | null) {
  if (!canDraw(actor, 'drawing.create')) throw new AppError(403, 'Anda tidak dapat membuat drawing.');
  const data = parse(drawingCreateSchema, input);
  try {
    return await idempotent(actor, key, 'drawing.create', data, async (tx) => {
      if (data.disciplineId) await requireActiveMaster(tx, 'disciplines', data.disciplineId);
      const id = randomUUID(),
        revisionId = randomUUID(),
        now = new Date();
      await tx.insert(drawings).values({
        id,
        number: data.number,
        title: data.title,
        hac: data.hac,
        disciplineId: data.disciplineId ?? null,
        description: data.description,
        ownerId: actor.id,
        ownerName: actor.name,
        uploaderId: actor.id,
        uploaderName: actor.name,
        source: 'standard',
        currentRevisionId: revisionId,
        workStatus: 'draft',
        createdAt: now,
        updatedAt: now,
      });
      await replaceOtherHacs(tx, id, cleanOtherHacs(data.hac, data.otherHacs));
      await tx.insert(revisions).values({
        id: revisionId,
        drawingId: id,
        revisionNo: data.revisionNo,
        status: 'draft',
        changeNote: data.changeNote,
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: now,
        updatedAt: now,
      });
      if (data.fileId) {
        await attachWorkingFile(tx, actor, data.fileId, revisionId, now);
        await tx.update(revisions).set({ workingFileId: data.fileId }).where(eq(revisions.id, revisionId));
      }
      await writeAudit(tx, actor, 'drawing.created', 'drawing', id, { ...data, revisionId }, id, now);
      return { status: 201, body: { id, revisionId }, targetId: id };
    });
  } catch (e) {
    throw conflictNumber(e);
  }
}

export async function createLegacyDrawing(
  actor: Identity,
  input: unknown,
  key: string | null,
  directory: () => Promise<DirectoryPerson[]>,
  /**
   * `drawnByName` hanya untuk impor arsip massal (scripts/drawings-import-legacy.ts): pembuat asli
   * bukan pengguna sistem, sehingga namanya dicatat apa adanya dan pengunggah tetap menjadi owner.
   */
  options: { drawnByName?: string } = {},
) {
  if (!canDraw(actor, 'drawing.legacy_upload'))
    throw new AppError(403, 'Anda tidak dapat mengunggah Old Drawing.');
  const data = parse(legacyCreateSchema, input);
  let ownerName = actor.name;
  if (options.drawnByName !== undefined) {
    const name = options.drawnByName.trim();
    if (data.ownerId !== actor.id || !name || name.length > 100)
      throw new AppError(
        400,
        'Drawn by arsip harus 1–100 karakter dan owner harus pengunggah.',
        'VALIDATION',
      );
    ownerName = name;
  } else if (data.ownerId !== actor.id) {
    const person = (await directory()).find((p) => p.id === data.ownerId && p.role === 'drafter');
    if (!person) throw new AppError(400, 'Drawn by harus Drafter aktif atau Anda sendiri.', 'VALIDATION');
    ownerName = person.name;
  }
  try {
    return await idempotent(actor, key, 'drawing.legacy', data, async (tx) => {
      await requireActiveMaster(tx, 'disciplines', data.disciplineId);
      const id = randomUUID(),
        revisionId = randomUUID(),
        now = new Date();
      await tx.insert(drawings).values({
        id,
        number: data.number,
        title: data.title,
        hac: data.hac,
        disciplineId: data.disciplineId,
        description: data.description,
        ownerId: data.ownerId,
        ownerName,
        uploaderId: actor.id,
        uploaderName: actor.name,
        source: 'legacy',
        legacyNote: data.legacyNote,
        currentRevisionId: revisionId,
        releasedRevisionId: revisionId,
        workStatus: 'completed',
        releasedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await replaceOtherHacs(tx, id, cleanOtherHacs(data.hac, data.otherHacs));
      // Legacy: langsung Completed tanpa approval digital, approval plan maupun stamp (§4.5).
      await tx.insert(revisions).values({
        id: revisionId,
        drawingId: id,
        revisionNo: data.revisionNo,
        status: 'completed',
        changeNote: '',
        createdById: actor.id,
        createdByName: actor.name,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await attachWorkingFile(tx, actor, data.fileId, revisionId, now);
      await tx.update(revisions).set({ workingFileId: data.fileId }).where(eq(revisions.id, revisionId));
      await writeAudit(
        tx,
        actor,
        'drawing.legacy_uploaded',
        'drawing',
        id,
        { ...data, ownerName, revisionId },
        id,
        now,
      );
      return { status: 201, body: { id, revisionId }, targetId: id };
    });
  } catch (e) {
    throw conflictNumber(e);
  }
}

/**
 * PATCH drawing. Sebelum rilis pertama: owner/admin mengedit metadata dan data revisi selama revisi
 * kerja dapat diedit. Setelah rilis: owner mengubah data revisi; metadata hanya dikoreksi admin
 * dengan alasan (§4.4). Mengganti file draft yang belum pernah di-submit membersihkan file lama.
 */
export async function updateDrawing(actor: Identity, id: string, input: unknown) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const { expectedVersion, reason, ...changes } = parse(drawingUpdateSchema, input);
  const metadata = drawingMetadataFields.filter((k) => changes[k] !== undefined);
  // HAC lain adalah metadata juga, tetapi disimpan di tabel relasi, bukan di baris drawing.
  const touchesMetadata = metadata.length > 0 || changes.otherHacs !== undefined;
  const revisionFields = (['revisionNo', 'changeNote', 'fileId'] as const).filter(
    (k) => changes[k] !== undefined,
  );
  if (!touchesMetadata && !revisionFields.length)
    throw new AppError(400, 'Tidak ada perubahan.', 'VALIDATION');
  let cleanup: { id: string; storageKey: string } | null = null;
  try {
    const result = await db().transaction(async (tx) => {
      const d = await lockDrawing(tx, id, expectedVersion, (row) => canSeeDrawing(actor, facts(row)));
      if (d.voidedAt) throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
      const [rev] = d.currentRevisionId
        ? await tx.select().from(revisions).where(eq(revisions.id, d.currentRevisionId)).for('update')
        : [];
      const permissions = drawingPermissions(actor, {
        ...facts(d),
        currentStatus: (rev?.status as RevisionStatus) ?? null,
      });
      const released = !!d.releasedRevisionId;
      const correction = released && touchesMetadata;
      if (correction) {
        if (!permissions.correct)
          throw new AppError(403, 'Metadata Final Drawing hanya dapat dikoreksi Admin.');
        if (!reason) throw new AppError(400, 'Alasan koreksi wajib diisi.', 'VALIDATION');
      } else if (touchesMetadata && !permissions.edit)
        throw new AppError(403, 'Anda tidak dapat mengedit drawing ini.');
      if (revisionFields.length) {
        if (
          !rev ||
          rev.id === d.releasedRevisionId ||
          !editableRevisionStatuses.includes(rev.status as RevisionStatus)
        )
          throw new AppError(409, 'Revisi ini tidak dapat diedit.', 'INVALID_TRANSITION');
        if (!permissions.edit) throw new AppError(403, 'Anda tidak dapat mengedit revisi ini.');
      }
      if (changes.disciplineId && changes.disciplineId !== d.disciplineId)
        await requireActiveMaster(tx, 'disciplines', changes.disciplineId);
      const now = new Date();
      const before: Record<string, unknown> = {},
        after: Record<string, unknown> = {};
      const drawingSet: Partial<DrawingRow> = {};
      for (const key of metadata) {
        const value = key === 'hac' ? normalizeHac(String(changes.hac)) : changes[key];
        if (d[key] === value) continue;
        before[key] = d[key];
        after[key] = value;
        (drawingSet as Record<string, unknown>)[key] = value;
      }
      // HAC utama yang baru tidak boleh tertinggal di daftar HAC lain.
      const currentOthers = (await otherHacsOf([d.id], tx)).get(d.id) ?? [];
      const nextOthers = cleanOtherHacs(drawingSet.hac ?? d.hac, changes.otherHacs ?? currentOthers);
      const othersChanged = JSON.stringify(nextOthers) !== JSON.stringify(currentOthers);
      if (othersChanged) {
        before.otherHacs = currentOthers;
        after.otherHacs = nextOthers;
      }
      const revisionSet: Partial<RevisionRow> = {};
      if (rev && changes.revisionNo !== undefined && changes.revisionNo !== rev.revisionNo) {
        before.revisionNo = rev.revisionNo;
        after.revisionNo = revisionSet.revisionNo = changes.revisionNo;
      }
      if (rev && changes.changeNote !== undefined && changes.changeNote !== rev.changeNote) {
        before.changeNote = rev.changeNote;
        after.changeNote = revisionSet.changeNote = changes.changeNote;
      }
      if (rev && changes.fileId && changes.fileId !== rev.workingFileId) {
        await attachWorkingFile(tx, actor, changes.fileId, rev.id, now);
        before.fileId = rev.workingFileId;
        after.fileId = revisionSet.workingFileId = changes.fileId;
        // Draft file replaced before ever being submitted is cleaned up; submitted files are permanent.
        if (rev.workingFileId && !rev.submittedAt) {
          const [old] = await tx.select().from(files).where(eq(files.id, rev.workingFileId)).for('update');
          if (old) {
            await tx.update(files).set({ status: 'orphaned', orphanedAt: now }).where(eq(files.id, old.id));
            cleanup = { id: old.id, storageKey: old.storageKey };
          }
        }
      }
      if (!Object.keys(after).length) return { id: d.id, version: d.version, changed: false };
      if (rev && Object.keys(revisionSet).length)
        await tx
          .update(revisions)
          .set({ ...revisionSet, updatedAt: now })
          .where(eq(revisions.id, rev.id));
      const version = d.version + 1;
      await tx
        .update(drawings)
        .set({ ...drawingSet, version, updatedAt: now })
        .where(eq(drawings.id, d.id));
      if (othersChanged) await replaceOtherHacs(tx, d.id, nextOthers);
      await writeAudit(
        tx,
        actor,
        correction ? 'drawing.corrected' : 'drawing.updated',
        'drawing',
        d.id,
        { before, after, ...(correction ? { reason } : {}), revisionId: rev?.id ?? null },
        d.id,
        now,
      );
      return { id: d.id, version, changed: true };
    });
    const orphan = cleanup as { id: string; storageKey: string } | null;
    if (orphan) await withStorage((s) => s.delete(orphan.storageKey)).catch(() => undefined);
    return result;
  } catch (e) {
    throw conflictNumber(e);
  }
}

export async function voidDrawing(actor: Identity, id: string, input: unknown, key: string | null) {
  if (!canDraw(actor, 'drawing.void')) throw new AppError(403, 'Anda tidak dapat membatalkan drawing.');
  const data = parse(voidSchema, input);
  return idempotent(actor, key, `drawing.void:${id}`, data, async (tx) => {
    const d = await lockDrawing(tx, id, data.expectedVersion, (row) => canSeeDrawing(actor, facts(row)));
    const [rev] = d.currentRevisionId
      ? await tx.select().from(revisions).where(eq(revisions.id, d.currentRevisionId))
      : [];
    if (d.voidedAt) throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
    if (
      !drawingPermissions(actor, { ...facts(d), currentStatus: (rev?.status as RevisionStatus) ?? null }).void
    )
      throw new AppError(403, 'Drawing ini tidak dapat dibatalkan oleh Anda.');
    const now = new Date();
    await tx
      .update(drawings)
      .set({
        voidedAt: now,
        voidReason: data.reason,
        voidedById: actor.id,
        voidedByName: actor.name,
        version: d.version + 1,
        updatedAt: now,
      })
      .where(eq(drawings.id, d.id));
    // Data, revisi, file dan audit tetap tersimpan (K9). Request asal ditutup dengan alasannya.
    await writeAudit(
      tx,
      actor,
      'drawing.voided',
      'drawing',
      d.id,
      { reason: data.reason, number: d.number },
      d.id,
      now,
    );
    await closeRequestForDrawing(tx, actor, d, { voided: data.reason }, now);
    return { status: 200, body: { id: d.id, version: d.version + 1 }, targetId: d.id };
  });
}

export async function transferOwner(
  actor: Identity,
  id: string,
  input: unknown,
  key: string | null,
  directory: () => Promise<DirectoryPerson[]>,
) {
  if (!canDraw(actor, 'drawing.transfer_owner'))
    throw new AppError(403, 'Anda tidak dapat mengalihkan owner.');
  const data = parse(transferOwnerSchema, input);
  const person = (await directory()).find(
    (p) => p.id === data.ownerId && (p.role === 'drafter' || p.role === 'admin'),
  );
  if (!person) throw new AppError(400, 'Owner baru harus Drafter atau Admin aktif.', 'VALIDATION');
  return idempotent(actor, key, `drawing.owner:${id}`, data, async (tx) => {
    const d = await lockDrawing(tx, id, data.expectedVersion, (row) => canSeeDrawing(actor, facts(row)));
    if (d.voidedAt) throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
    if (d.ownerId === person.id)
      throw new AppError(400, 'Pengguna tersebut sudah menjadi owner.', 'VALIDATION');
    const now = new Date();
    await tx
      .update(drawings)
      .set({ ownerId: person.id, ownerName: person.name, version: d.version + 1, updatedAt: now })
      .where(eq(drawings.id, d.id));
    await writeAudit(
      tx,
      actor,
      'drawing.owner_transferred',
      'drawing',
      d.id,
      {
        from: { id: d.ownerId, name: d.ownerName },
        to: { id: person.id, name: person.name },
        reason: data.reason,
      },
      d.id,
      now,
    );
    return { status: 200, body: { id: d.id, version: d.version + 1 }, targetId: d.id };
  });
}

// ───────────────────────── Baca ─────────────────────────

const PAGE = 50;
/** Drawing Library dengan filter dan pagination cursor di server (§9). */
export async function listDrawings(actor: Identity, params: URLSearchParams): Promise<DrawingPage> {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const tab = (params.get('tab') || 'released') as LibraryTab;
  if (!libraryTabs.includes(tab)) throw new AppError(400, 'Tab tidak dikenal.');
  const wipValue = canSeeWip(actor, { ownerId: '' })
    ? 'all'
    : canSeeWip(actor, { ownerId: actor.id })
      ? 'own'
      : 'none';
  if (tab === 'wip' && wipValue === 'none')
    throw new AppError(403, 'Anda tidak dapat melihat drawing dalam proses.');
  if (tab === 'void' && drawingsRole(actor) !== 'admin')
    throw new AppError(403, 'Hanya Admin yang dapat melihat drawing dibatalkan.');
  const display = tab === 'released' ? drawings.releasedRevisionId : drawings.currentRevisionId;
  const sortTime = tab === 'released' ? drawings.releasedAt : drawings.updatedAt;
  const where: (SQL | undefined)[] = [];
  if (tab === 'released') where.push(isNotNull(drawings.releasedRevisionId), isNull(drawings.voidedAt));
  if (tab === 'wip') {
    where.push(
      isNull(drawings.voidedAt),
      or(isNull(drawings.releasedRevisionId), ne(drawings.currentRevisionId, drawings.releasedRevisionId)),
    );
    if (wipValue === 'own') where.push(eq(drawings.ownerId, actor.id));
  }
  if (tab === 'void') where.push(isNotNull(drawings.voidedAt));
  const q = params.get('q')?.trim().slice(0, 100);
  if (q) {
    const like = `%${likeEscape(q)}%`;
    where.push(
      sql`(${drawings.number} LIKE ${like} OR ${drawings.title} LIKE ${like} OR ${drawings.hac} LIKE ${like} OR ${otherHacLike(like)})`,
    );
  }
  const status = params.get('status');
  if (status) {
    if (!(revisionStatuses as readonly string[]).includes(status))
      throw new AppError(400, 'Status tidak dikenal.');
    where.push(eq(revisions.status, status));
  }
  for (const [param, column] of [
    ['disciplineId', drawings.disciplineId],
    ['ownerId', drawings.ownerId],
  ] as const) {
    const value = params.get(param);
    if (!value) continue;
    if (!/^[0-9a-f-]{36}$/.test(value)) throw new AppError(400, `Filter ${param} tidak valid.`);
    where.push(eq(column, value));
  }
  const revision = params.get('revision')?.trim();
  if (revision) where.push(eq(revisions.revisionNo, revision.slice(0, 20)));
  const from = params.get('from'),
    to = params.get('to');
  if (from) where.push(sql`${sortTime} >= ${wibDayStart(from, 'Tanggal awal')}`);
  if (to) where.push(lt(sortTime, new Date(wibDayStart(to, 'Tanggal akhir').getTime() + 86_400_000)));
  const cursor = decodeCursor(params.get('cursor'));
  if (cursor)
    where.push(or(lt(sortTime, cursor.at), and(eq(sortTime, cursor.at), lt(drawings.id, cursor.id))));
  const rows = await db()
    .select({
      d: drawings,
      discipline: disciplines.name,
      revisionNo: revisions.revisionNo,
      status: revisions.status,
    })
    .from(drawings)
    .leftJoin(disciplines, eq(disciplines.id, drawings.disciplineId))
    .innerJoin(revisions, eq(revisions.id, display))
    .where(and(...where))
    .orderBy(desc(sortTime), desc(drawings.id))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const others = await otherHacsOf(page.map((r) => r.d.id));
  const items: DrawingListItem[] = page.map(({ d, discipline, revisionNo, status }) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    hac: d.hac,
    otherHacs: others.get(d.id) ?? [],
    discipline,
    owner: { id: d.ownerId, name: d.ownerName },
    source: d.source as 'standard' | 'legacy',
    revisionNo,
    status: status as RevisionStatus,
    revising: !!d.releasedRevisionId && d.currentRevisionId !== d.releasedRevisionId,
    voided: !!d.voidedAt,
    releasedAt: iso(d.releasedAt),
    updatedAt: d.updatedAt.toISOString(),
  }));
  const last = page[page.length - 1]?.d;
  return {
    items,
    nextCursor:
      rows.length > PAGE && last
        ? encodeCursor(tab === 'released' ? last.releasedAt : last.updatedAt, last.id)
        : null,
  };
}

async function revisionSummaries(rows: RevisionRow[]): Promise<Map<string, RevisionSummary>> {
  const fileIds = rows.flatMap((r) => [r.issuedFileId ?? r.workingFileId].filter((v): v is string => !!v));
  const fileRows = fileIds.length ? await db().select().from(files).where(inArray(files.id, fileIds)) : [];
  const byId = new Map(fileRows.map((f) => [f.id, f]));
  return new Map(
    rows.map((r) => {
      const file = byId.get(r.issuedFileId ?? r.workingFileId ?? '');
      return [
        r.id,
        {
          id: r.id,
          revisionNo: r.revisionNo,
          status: r.status as RevisionStatus,
          cycle: r.cycle,
          changeNote: r.changeNote,
          hasFile: !!file,
          fileName: file?.originalName ?? null,
          pageCount: file?.pageCount ?? null,
          createdBy: { id: r.createdById, name: r.createdByName },
          submittedAt: iso(r.submittedAt),
          completedAt: iso(r.completedAt),
          obsoleteAt: iso(r.obsoleteAt),
          cancelledAt: iso(r.cancelledAt),
          cancelReason: r.cancelReason,
          createdAt: r.createdAt.toISOString(),
        },
      ];
    }),
  );
}

export async function loadVisible(actor: Identity, id: string) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError(404, 'Drawing tidak ditemukan.');
  const [d] = await db().select().from(drawings).where(eq(drawings.id, id));
  // Not visible and not existing answer the same, so URLs do not reveal hidden drawings.
  if (!d || !canSeeDrawing(actor, facts(d))) throw new AppError(404, 'Drawing tidak ditemukan.');
  return d;
}

/** Detail tanpa data alur approval; `approval.ts` melengkapinya menjadi `DrawingDetail`. */
export async function drawingDetailBase(
  actor: Identity,
  id: string,
): Promise<{ detail: Omit<DrawingDetail, 'workflow'>; row: DrawingRow; current: RevisionRow | undefined }> {
  const d = await loadVisible(actor, id);
  const seeWip = canSeeWip(actor, d);
  const [discipline] = d.disciplineId
    ? await db().select().from(disciplines).where(eq(disciplines.id, d.disciplineId))
    : [];
  const all = await db()
    .select()
    .from(revisions)
    .where(eq(revisions.drawingId, d.id))
    .orderBy(desc(revisions.createdAt), desc(revisions.id));
  const visible = seeWip ? all : all.filter((r) => r.id === d.releasedRevisionId);
  const summaries = await revisionSummaries(visible);
  const current = all.find((r) => r.id === d.currentRevisionId);
  const detail: Omit<DrawingDetail, 'workflow'> = {
    id: d.id,
    number: d.number,
    title: d.title,
    hac: d.hac,
    otherHacs: (await otherHacsOf([d.id])).get(d.id) ?? [],
    disciplineId: d.disciplineId,
    discipline: discipline?.name ?? null,
    description: d.description,
    owner: { id: d.ownerId, name: d.ownerName },
    uploadedBy: { id: d.uploaderId, name: d.uploaderName },
    source: d.source as 'standard' | 'legacy',
    legacyNote: d.legacyNote,
    version: d.version,
    voided: d.voidedAt
      ? {
          at: d.voidedAt.toISOString(),
          reason: d.voidReason ?? '',
          by: { id: d.voidedById ?? '', name: d.voidedByName ?? '' },
        }
      : null,
    released: d.releasedRevisionId ? (summaries.get(d.releasedRevisionId) ?? null) : null,
    current: seeWip && d.currentRevisionId ? (summaries.get(d.currentRevisionId) ?? null) : null,
    revising: !!d.releasedRevisionId && d.currentRevisionId !== d.releasedRevisionId,
    revisions: visible.map((r) => summaries.get(r.id)!),
    permissions: drawingPermissions(actor, {
      ...facts(d),
      currentStatus: (current?.status as RevisionStatus) ?? null,
    }),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
  return { detail, row: d, current };
}

const toTimeline = (r: typeof audit.$inferSelect): TimelineEntry => ({
  id: r.id,
  action: r.action,
  actor: { id: r.actorId, name: r.actorName },
  details: JSON.parse(r.details),
  createdAt: r.createdAt.toISOString(),
});
/** Jejak aktivitas drawing; hanya bagi yang boleh melihat data dalam proses. */
export async function drawingTimeline(actor: Identity, id: string, cursorValue: string | null) {
  const d = await loadVisible(actor, id);
  if (!canSeeWip(actor, d)) throw new AppError(403, 'Jejak aktivitas tidak tersedia untuk role Anda.');
  const cursor = decodeCursor(cursorValue);
  const rows = await db()
    .select()
    .from(audit)
    .where(
      and(
        eq(audit.drawingId, d.id),
        cursor
          ? or(lt(audit.createdAt, cursor.at), and(eq(audit.createdAt, cursor.at), lt(audit.id, cursor.id)))
          : undefined,
      ),
    )
    .orderBy(desc(audit.createdAt), desc(audit.id))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  return {
    items: page.map(toTimeline),
    nextCursor: rows.length > PAGE && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

/** Audit seluruh Drawing Database untuk admin. */
export async function auditList(actor: Identity, cursorValue: string | null) {
  if (!canDraw(actor, 'admin.manage')) throw new AppError(403, 'Audit hanya untuk Admin Drawing Database.');
  const cursor = decodeCursor(cursorValue);
  const rows = await db()
    .select()
    .from(audit)
    .where(
      cursor
        ? or(lt(audit.createdAt, cursor.at), and(eq(audit.createdAt, cursor.at), lt(audit.id, cursor.id)))
        : undefined,
    )
    .orderBy(desc(audit.createdAt), desc(audit.id))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      ...toTimeline(r),
      targetType: r.targetType,
      targetId: r.targetId,
      drawingId: r.drawingId,
    })),
    nextCursor: rows.length > PAGE && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

/** Saran HAC/SAC dari nilai yang ada; tanpa hak WIP hanya dari Final Drawing. */
export async function hacSuggestions(actor: Identity, q: string) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const prefix = q.trim().toUpperCase().replace(/^TQ\./, '').slice(0, 40);
  const seeAll = canSeeWip(actor, { ownerId: '' });
  const rows = await db()
    .selectDistinct({ hac: drawings.hac })
    .from(drawings)
    .where(
      and(
        isNull(drawings.voidedAt),
        prefix ? sql`${drawings.hac} LIKE ${likeEscape(prefix) + '%'}` : undefined,
        seeAll ? undefined : or(isNotNull(drawings.releasedRevisionId), eq(drawings.ownerId, actor.id)),
      ),
    )
    .orderBy(asc(drawings.hac))
    .limit(10);
  const others = await db()
    .selectDistinct({ hac: drawingHacs.hac })
    .from(drawingHacs)
    .innerJoin(drawings, eq(drawings.id, drawingHacs.drawingId))
    .where(
      and(
        isNull(drawings.voidedAt),
        prefix ? sql`${drawingHacs.hac} LIKE ${likeEscape(prefix) + '%'}` : undefined,
        seeAll ? undefined : or(isNotNull(drawings.releasedRevisionId), eq(drawings.ownerId, actor.id)),
      ),
    )
    .orderBy(asc(drawingHacs.hac))
    .limit(10);
  const items = [...new Set([...rows, ...others].map((r) => r.hac))].sort().slice(0, 10);
  return { items };
}

export type FileIntent = 'view' | 'download' | 'print';
/**
 * Memilih file revisi yang boleh dibuka actor (issued untuk Completed/Obsolete bila ada, file kerja
 * selain itu). Download dan print hanya untuk Completed dan dicatat pada audit; `view` tidak.
 */
export async function revisionFile(actor: Identity, revisionId: string, intent: FileIntent) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  if (!['view', 'download', 'print'].includes(intent)) throw new AppError(400, 'Intent tidak dikenal.');
  if (!/^[0-9a-f-]{36}$/.test(revisionId)) throw new AppError(404, 'Revisi tidak ditemukan.');
  const [rev] = await db().select().from(revisions).where(eq(revisions.id, revisionId));
  const [d] = rev ? await db().select().from(drawings).where(eq(drawings.id, rev.drawingId)) : [];
  if (!rev || !d || !canSeeRevision(actor, facts(d), rev.id))
    throw new AppError(404, 'Revisi tidak ditemukan.');
  if (intent !== 'view' && rev.status !== 'completed')
    throw new AppError(
      409,
      'Download dan print hanya untuk Final Drawing (Completed).',
      'INVALID_TRANSITION',
    );
  if (intent !== 'view' && d.voidedAt)
    throw new AppError(409, 'Drawing sudah dibatalkan.', 'INVALID_TRANSITION');
  const useIssued = (rev.status === 'completed' || rev.status === 'obsolete') && rev.issuedFileId;
  const fileId = useIssued ? rev.issuedFileId : rev.workingFileId;
  if (!fileId) throw new AppError(404, 'Revisi ini belum mempunyai file.', 'FILE_REQUIRED');
  const [file] = await db().select().from(files).where(eq(files.id, fileId));
  if (!file || file.status !== 'attached') throw new AppError(404, 'File tidak ditemukan.');
  if (intent !== 'view')
    await writeAudit(
      db(),
      actor,
      intent === 'download' ? 'file.downloaded' : 'file.printed',
      'revision',
      rev.id,
      {
        fileId: file.id,
        revisionNo: rev.revisionNo,
        number: d.number,
      },
      d.id,
    );
  return { file, name: drawingFileName(d.number, rev.revisionNo) };
}

/** Konteks ringkas satu revisi untuk viewer penuh; aturan izin sama dengan file revisi. */
export async function revisionContext(actor: Identity, revisionId: string) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  if (!/^[0-9a-f-]{36}$/.test(revisionId)) throw new AppError(404, 'Revisi tidak ditemukan.');
  const [rev] = await db().select().from(revisions).where(eq(revisions.id, revisionId));
  const [d] = rev ? await db().select().from(drawings).where(eq(drawings.id, rev.drawingId)) : [];
  if (!rev || !d || !canSeeRevision(actor, facts(d), rev.id))
    throw new AppError(404, 'Revisi tidak ditemukan.');
  return {
    drawingId: d.id,
    number: d.number,
    title: d.title,
    revisionNo: rev.revisionNo,
    status: rev.status as RevisionStatus,
    voided: !!d.voidedAt,
    hasFile: !!(rev.issuedFileId ?? rev.workingFileId),
  };
}
