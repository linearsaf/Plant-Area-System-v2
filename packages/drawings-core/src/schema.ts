// Schema Drizzle database `plant_drawings` (PRD §8.2). Ditambahkan secara aditif per fase:
// Fase 2 menambah file dan audit; master, drawing, revisi, request dan notifikasi menyusul.
import { mysqlTable, varchar, char, int, bigint, text, timestamp, index } from 'drizzle-orm/mysql-core';

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
