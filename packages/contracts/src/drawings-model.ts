// Drawing Database — status, data, schema input dan aturan visibilitas (PRD §3–§5).
// Fungsi murni; server memeriksa ulang setiap aturan terhadap data terkunci.
import { z } from 'zod';
import type { Identity } from './index';
import { canDraw, drawingsPermission, drawingsRole } from './drawings';

export const revisionStatuses = [
  'draft',
  'waiting_check',
  'check_rejected',
  'waiting_approval_1',
  'approval_1_rejected',
  'waiting_approval_2',
  'approval_2_rejected',
  'completed',
  'obsolete',
  'cancelled',
] as const;
export type RevisionStatus = (typeof revisionStatuses)[number];
export const revisionStatusLabels: Record<RevisionStatus, string> = {
  draft: 'Draft',
  waiting_check: 'Waiting Check',
  check_rejected: 'Check Rejected',
  waiting_approval_1: 'Waiting Approval L1',
  approval_1_rejected: 'Approval L1 Rejected',
  waiting_approval_2: 'Waiting Final Approval',
  approval_2_rejected: 'Final Approval Rejected',
  completed: 'Completed',
  obsolete: 'Obsolete',
  cancelled: 'Cancelled',
};
export const editableRevisionStatuses: readonly RevisionStatus[] = [
  'draft',
  'check_rejected',
  'approval_1_rejected',
  'approval_2_rejected',
];
export type RevisionTone = 'neutral' | 'waiting' | 'attention' | 'final' | 'muted';
/** Tone badge tanpa palet baru: rejected = perhatian (pumpkin), completed = lime, sisanya netral. */
export function revisionStatusTone(status: RevisionStatus): RevisionTone {
  if (status === 'completed') return 'final';
  if (status.endsWith('_rejected')) return 'attention';
  if (status.startsWith('waiting_')) return 'waiting';
  if (status === 'obsolete' || status === 'cancelled') return 'muted';
  return 'neutral';
}

/** HAC/SAC: trim, kapital, prefiks `TQ.` dibuang; 1–40 karakter (Q2: format bebas). */
export function normalizeHac(value: string) {
  return value.trim().toUpperCase().replace(/^TQ\./, '').trim();
}
const hac = z
  .string()
  .transform(normalizeHac)
  .pipe(z.string().min(1, 'HAC/SAC wajib diisi.').max(40, 'HAC/SAC maksimal 40 karakter.'));
const id = z.string().regex(/^[0-9a-f-]{36}$/, 'ID tidak valid.');
const text = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `${label} wajib diisi.`).max(max, `${label} maksimal ${max} karakter.`);
export const revisionNoSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9.-]{1,20}$/, 'Nomor revisi 1–20 karakter: huruf, angka, titik atau tanda hubung.');
const version = z.number().int().min(1);

export const drawingCreateSchema = z
  .object({
    number: text('Drawing Number', 1, 100),
    title: text('Drawing Name', 1, 255),
    hac,
    areaId: id,
    disciplineId: id.nullable().optional(),
    description: text('Description', 0, 2000).default(''),
    revisionNo: revisionNoSchema.default('0'),
    changeNote: text('Change Note', 0, 1000).default(''),
    fileId: id.nullable().optional(),
  })
  .strict();
export type DrawingCreateInput = z.input<typeof drawingCreateSchema>;

export const legacyCreateSchema = z
  .object({
    number: text('Drawing Number', 1, 100),
    title: text('Drawing Name', 1, 255),
    hac,
    areaId: id,
    disciplineId: id,
    description: text('Description', 0, 2000).default(''),
    revisionNo: revisionNoSchema,
    ownerId: id,
    legacyNote: text('Legacy Ready Note', 1, 1000),
    fileId: id,
  })
  .strict();
export type LegacyCreateInput = z.input<typeof legacyCreateSchema>;

/** Edit draft (owner/admin) atau koreksi metadata oleh admin setelah rilis (alasan wajib). */
export const drawingUpdateSchema = z
  .object({
    expectedVersion: version,
    number: text('Drawing Number', 1, 100).optional(),
    title: text('Drawing Name', 1, 255).optional(),
    hac: hac.optional(),
    areaId: id.optional(),
    disciplineId: id.nullable().optional(),
    description: text('Description', 0, 2000).optional(),
    revisionNo: revisionNoSchema.optional(),
    changeNote: text('Change Note', 0, 1000).optional(),
    fileId: id.optional(),
    reason: text('Alasan koreksi', 1, 500).optional(),
  })
  .strict();
export type DrawingUpdateInput = z.input<typeof drawingUpdateSchema>;
export const drawingMetadataFields = [
  'number',
  'title',
  'hac',
  'areaId',
  'disciplineId',
  'description',
] as const;
export const revisionDataFields = ['revisionNo', 'changeNote', 'fileId'] as const;

export const voidSchema = z.object({ expectedVersion: version, reason: text('Alasan', 1, 500) }).strict();
export const transferOwnerSchema = z
  .object({ expectedVersion: version, ownerId: id, reason: text('Alasan', 0, 500).default('') })
  .strict();
export const masterCreateSchema = z
  .object({ name: text('Nama', 1, 100), sortOrder: z.number().int().min(0).max(9999).default(0) })
  .strict();
export const masterUpdateSchema = z
  .object({
    expectedVersion: version,
    name: text('Nama', 1, 100).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    active: z.boolean().optional(),
  })
  .strict();
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;
export const libraryTabs = ['released', 'wip', 'void'] as const;
export type LibraryTab = (typeof libraryTabs)[number];

export type MasterItem = { id: string; name: string; active: boolean; sortOrder: number; version: number };
export type DrawingsMasters = { areas: MasterItem[]; disciplines: MasterItem[] };
export type PersonRef = { id: string; name: string };
export type RevisionSummary = {
  id: string;
  revisionNo: string;
  status: RevisionStatus;
  cycle: number;
  changeNote: string;
  hasFile: boolean;
  fileName: string | null;
  pageCount: number | null;
  createdBy: PersonRef;
  submittedAt: string | null;
  completedAt: string | null;
  obsoleteAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
};
export type DrawingListItem = {
  id: string;
  number: string | null;
  title: string | null;
  hac: string;
  area: string;
  discipline: string | null;
  owner: PersonRef;
  source: 'standard' | 'legacy';
  revisionNo: string;
  status: RevisionStatus;
  /** Ada revisi berikutnya yang sedang diproses (tanpa rincian bagi viewer). */
  revising: boolean;
  voided: boolean;
  releasedAt: string | null;
  updatedAt: string;
};
export type DrawingPage = { items: DrawingListItem[]; nextCursor: string | null };
export type DrawingPermissions = {
  edit: boolean;
  correct: boolean;
  void: boolean;
  transferOwner: boolean;
  seeWip: boolean;
  timeline: boolean;
};
export type DrawingDetail = {
  id: string;
  number: string | null;
  title: string | null;
  hac: string;
  areaId: string;
  area: string;
  disciplineId: string | null;
  discipline: string | null;
  description: string;
  owner: PersonRef;
  uploadedBy: PersonRef;
  source: 'standard' | 'legacy';
  legacyNote: string | null;
  version: number;
  voided: { at: string; reason: string; by: PersonRef } | null;
  released: RevisionSummary | null;
  current: RevisionSummary | null;
  revising: boolean;
  revisions: RevisionSummary[];
  permissions: DrawingPermissions;
  createdAt: string;
  updatedAt: string;
};
export type TimelineEntry = {
  id: string;
  action: string;
  actor: PersonRef;
  details: Record<string, unknown>;
  createdAt: string;
};

/** Fakta minimum drawing untuk aturan visibilitas, terpisah dari bentuk tabel. */
export type DrawingAccessFacts = {
  ownerId: string;
  voided: boolean;
  released: boolean;
  everSubmitted: boolean;
};
/** Boleh melihat revisi yang belum final, obsolete dan cancelled (PRD §3). */
export function canSeeWip(identity: Identity, d: Pick<DrawingAccessFacts, 'ownerId'>) {
  const value = drawingsPermission(identity, 'wip.read');
  return value === true || (value === 'own' && d.ownerId === identity.id);
}
/** Boleh melihat drawing ini sama sekali. Drawing void hanya admin. */
export function canSeeDrawing(identity: Identity, d: DrawingAccessFacts) {
  const role = drawingsRole(identity);
  if (!role) return false;
  if (d.voided) return role === 'admin';
  return d.released || canSeeWip(identity, d);
}
/** Revisi tertentu dapat dibuka (termasuk file). Tanpa hak WIP hanya Final Drawing yang berlaku. */
export function canSeeRevision(
  identity: Identity,
  d: DrawingAccessFacts & { releasedRevisionId: string | null },
  revisionId: string,
) {
  if (!canSeeDrawing(identity, d)) return false;
  return canSeeWip(identity, d) || d.releasedRevisionId === revisionId;
}
/** Izin aksi actor atas drawing (PRD §3, §4.4, §4.7). Kondisi status diperiksa ulang di server. */
export function drawingPermissions(
  identity: Identity,
  d: DrawingAccessFacts & { currentStatus: RevisionStatus | null },
): DrawingPermissions {
  const role = drawingsRole(identity);
  const own = d.ownerId === identity.id;
  const editable = !d.voided && !!d.currentStatus && editableRevisionStatuses.includes(d.currentStatus);
  const editValue = drawingsPermission(identity, 'drawing.edit_submit');
  const voidValue = drawingsPermission(identity, 'drawing.void');
  const seeWip = canSeeWip(identity, d);
  return {
    edit: editable && (editValue === true || (editValue === 'own' && own)),
    correct: !d.voided && d.released && role === 'admin',
    void:
      !d.voided &&
      (voidValue === true || (voidValue === 'own_unsubmitted' && own && !d.everSubmitted && !d.released)),
    transferOwner: !d.voided && canDraw(identity, 'drawing.transfer_owner'),
    seeWip,
    timeline: seeWip,
  };
}
/** Nama unduhan Final Drawing: `<DrawingNumber>_Rev-<n>.pdf`. */
export function drawingFileName(number: string | null, revisionNo: string) {
  const base = (number || 'Drawing').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
  return `${base}_Rev-${revisionNo}.pdf`;
}
