// Schema Drizzle database `plant_drawings` (PRD §8.2). Ditambahkan secara aditif per fase:
// Fase 2 menambah file dan audit; master, drawing, revisi, request dan notifikasi menyusul.
import { sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  char,
  int,
  bigint,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

const master = (name: string) =>
  mysqlTable(
    name,
    {
      id: varchar('id', { length: 36 }).primaryKey(),
      name: varchar('name', { length: 100 }).notNull(),
      active: boolean('active').notNull().default(true),
      sortOrder: int('sort_order').notNull().default(0),
      version: int('version').notNull().default(1),
      createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
      updatedAt: timestamp('updated_at', { fsp: 3 }).notNull(),
    },
    (t) => [uniqueIndex(`${name}_name_uq`).on(t.name)],
  );
/** Master Discipline (K10). Nilai awal disisipkan migrasi. */
export const disciplines = master('disciplines');

/**
 * Akar agregat. `releasedRevisionId` = Final Drawing yang berlaku; `currentRevisionId` = revisi
 * yang sedang dikerjakan (sama dengan rilis bila tidak ada revisi aktif). Nomor unik di antara
 * drawing yang tidak void memakai kolom generated karena MySQL tidak punya partial index.
 */
export const drawings = mysqlTable(
  'drawings',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    number: varchar('number', { length: 100 }),
    title: varchar('title', { length: 255 }),
    hac: varchar('hac', { length: 40 }).notNull(),
    disciplineId: varchar('discipline_id', { length: 36 }),
    description: text('description').notNull(),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    ownerName: varchar('owner_name', { length: 100 }).notNull(),
    uploaderId: varchar('uploader_id', { length: 36 }).notNull(),
    uploaderName: varchar('uploader_name', { length: 100 }).notNull(),
    source: varchar('source', { length: 12 }).notNull(), // standard | legacy
    legacyNote: text('legacy_note'),
    currentRevisionId: varchar('current_revision_id', { length: 36 }),
    releasedRevisionId: varchar('released_revision_id', { length: 36 }),
    workStatus: varchar('work_status', { length: 24 }).notNull(),
    everSubmitted: boolean('ever_submitted').notNull().default(false),
    requestId: varchar('request_id', { length: 36 }),
    releasedAt: timestamp('released_at', { fsp: 3 }),
    voidedAt: timestamp('voided_at', { fsp: 3 }),
    voidReason: varchar('void_reason', { length: 500 }),
    voidedById: varchar('voided_by_id', { length: 36 }),
    voidedByName: varchar('voided_by_name', { length: 100 }),
    version: int('version').notNull().default(1),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).notNull(),
    numberActive: varchar('number_active', { length: 100 }).generatedAlwaysAs(
      sql`(case when \`voided_at\` is null then \`number\` end)`,
      { mode: 'stored' },
    ),
  },
  (t) => [
    uniqueIndex('drawings_number_active_uq').on(t.numberActive),
    index('drawings_status_time_idx').on(t.workStatus, t.updatedAt),
    index('drawings_released_idx').on(t.releasedAt, t.id),
    index('drawings_updated_idx').on(t.updatedAt, t.id),
    index('drawings_owner_idx').on(t.ownerId),
    index('drawings_hac_idx').on(t.hac),
  ],
);

/** Revisi selalu baris baru; revisi Completed tidak pernah diubah isinya. */
export const revisions = mysqlTable(
  'drawing_revisions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    drawingId: varchar('drawing_id', { length: 36 }).notNull(),
    revisionNo: varchar('revision_no', { length: 20 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    cycle: int('cycle').notNull().default(0),
    workingFileId: varchar('working_file_id', { length: 36 }),
    issuedFileId: varchar('issued_file_id', { length: 36 }),
    changeNote: varchar('change_note', { length: 1000 }).notNull().default(''),
    createdById: varchar('created_by_id', { length: 36 }).notNull(),
    createdByName: varchar('created_by_name', { length: 100 }).notNull(),
    submittedById: varchar('submitted_by_id', { length: 36 }),
    submittedByName: varchar('submitted_by_name', { length: 100 }),
    submittedAt: timestamp('submitted_at', { fsp: 3 }),
    completedAt: timestamp('completed_at', { fsp: 3 }),
    obsoleteAt: timestamp('obsolete_at', { fsp: 3 }),
    cancelledAt: timestamp('cancelled_at', { fsp: 3 }),
    cancelReason: varchar('cancel_reason', { length: 500 }),
    cancelledById: varchar('cancelled_by_id', { length: 36 }),
    cancelledByName: varchar('cancelled_by_name', { length: 100 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).notNull(),
    revisionActive: varchar('revision_active', { length: 20 }).generatedAlwaysAs(
      sql`(case when \`status\` <> 'cancelled' then \`revision_no\` end)`,
      { mode: 'stored' },
    ),
  },
  (t) => [
    uniqueIndex('drawing_revisions_no_uq').on(t.drawingId, t.revisionActive),
    index('drawing_revisions_drawing_idx').on(t.drawingId, t.createdAt),
    index('drawing_revisions_status_idx').on(t.status, t.updatedAt),
  ],
);

/** Approval plan per revisi (PRD §4.2): level 1 wajib, level 2 opsional; satu baris per level. */
export const approvalSteps = mysqlTable(
  'revision_approval_steps',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    revisionId: varchar('revision_id', { length: 36 }).notNull(),
    level: int('level').notNull(),
    assigneeId: varchar('assignee_id', { length: 36 }).notNull(),
    assigneeName: varchar('assignee_name', { length: 100 }).notNull(),
    assignedById: varchar('assigned_by_id', { length: 36 }).notNull(),
    assignedByName: varchar('assigned_by_name', { length: 100 }).notNull(),
    assignedAt: timestamp('assigned_at', { fsp: 3 }).notNull(),
  },
  (t) => [
    uniqueIndex('revision_approval_steps_level_uq').on(t.revisionId, t.level),
    index('revision_approval_steps_assignee_idx').on(t.assigneeId, t.level),
  ],
);

/** Keputusan Check (0), Approval L1 (1), Final Approval (2) per siklus beserta file yang ditinjau. */
export const approvalActions = mysqlTable(
  'approval_actions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    revisionId: varchar('revision_id', { length: 36 }).notNull(),
    drawingId: varchar('drawing_id', { length: 36 }).notNull(),
    cycle: int('cycle').notNull(),
    level: int('level').notNull(),
    decision: varchar('decision', { length: 12 }).notNull(), // approved | rejected
    note: varchar('note', { length: 1000 }).notNull().default(''),
    actorId: varchar('actor_id', { length: 36 }).notNull(),
    actorName: varchar('actor_name', { length: 100 }).notNull(),
    actorRole: varchar('actor_role', { length: 16 }).notNull(),
    reviewedFileId: varchar('reviewed_file_id', { length: 36 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
  },
  (t) => [
    uniqueIndex('approval_actions_cycle_level_uq').on(t.revisionId, t.cycle, t.level),
    index('approval_actions_drawing_idx').on(t.drawingId, t.createdAt),
  ],
);

/** Idempotency-Key per actor; respons disimpan untuk replay payload yang sama. */
export const idempotency = mysqlTable(
  'drawing_idempotency',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    actorId: varchar('actor_id', { length: 36 }).notNull(),
    key: varchar('request_key', { length: 128 }).notNull(),
    hash: char('payload_hash', { length: 64 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 36 }).notNull(),
    status: int('status').notNull(),
    response: text('response').notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
  },
  (t) => [uniqueIndex('drawing_idempotency_actor_key_uq').on(t.actorId, t.key)],
);

/**
 * Metadata file di object storage. Isi file tidak pernah disimpan di database.
 * `status`: `staged` (baru diunggah, belum dirujuk), `attached` (dirujuk data), `orphaned`
 * (staged kedaluwarsa atau diganti sebelum pernah submit; objek storage sudah dibersihkan).
 */
export const files = mysqlTable(
  'drawing_files',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    kind: varchar('kind', { length: 8 }).notNull(), // pdf | image
    purpose: varchar('purpose', { length: 16 }), // working | issued | attachment | reference (diisi saat attach)
    storageKey: varchar('storage_key', { length: 200 }).notNull().unique(),
    originalName: varchar('original_name', { length: 200 }).notNull(),
    mime: varchar('mime', { length: 64 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    sha256: char('sha256', { length: 64 }).notNull(),
    pageCount: int('page_count'),
    status: varchar('status', { length: 12 }).notNull(),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    ownerName: varchar('owner_name', { length: 100 }).notNull(),
    parentType: varchar('parent_type', { length: 16 }),
    parentId: varchar('parent_id', { length: 36 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
    attachedAt: timestamp('attached_at', { fsp: 3 }),
    orphanedAt: timestamp('orphaned_at', { fsp: 3 }),
  },
  (t) => [
    index('drawing_files_status_time_idx').on(t.status, t.createdAt),
    index('drawing_files_owner_idx').on(t.ownerId, t.createdAt),
    index('drawing_files_parent_idx').on(t.parentType, t.parentId),
  ],
);

/** Audit append-only. Actor disimpan sebagai snapshot; tanpa foreign key lintas database. */
export const audit = mysqlTable(
  'drawing_audit',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    actorId: varchar('actor_id', { length: 36 }).notNull(),
    actorName: varchar('actor_name', { length: 100 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 16 }).notNull(),
    targetId: varchar('target_id', { length: 36 }).notNull(),
    drawingId: varchar('drawing_id', { length: 36 }),
    details: text('details').notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull(),
  },
  (t) => [
    index('drawing_audit_time_idx').on(t.createdAt, t.id),
    index('drawing_audit_drawing_idx').on(t.drawingId, t.createdAt),
  ],
);
