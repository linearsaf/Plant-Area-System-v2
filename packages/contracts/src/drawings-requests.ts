// Drawing Request, notifikasi dan ringkasan (PRD §4.6, §4.8, §9; Fase 5).
import { z } from 'zod';
import type { Identity } from './index';
import { drawingsPermission, drawingsRole } from './drawings';
import { normalizeHac } from './drawings-model';

export const requestStatuses = [
  'pending_review',
  'review_rejected',
  'waiting_drafter_acceptance',
  'drafter_rejected',
  'in_progress',
  'closed',
] as const;
export type RequestStatus = (typeof requestStatuses)[number];
export const requestStatusLabels: Record<RequestStatus, string> = {
  pending_review: 'Menunggu review',
  review_rejected: 'Ditolak Draft Leader',
  waiting_drafter_acceptance: 'Menunggu Drafter',
  drafter_rejected: 'Ditolak Drafter',
  in_progress: 'Sedang dikerjakan',
  closed: 'Selesai',
};
export function requestStatusTone(
  status: RequestStatus,
): 'neutral' | 'waiting' | 'attention' | 'final' | 'muted' {
  if (status === 'review_rejected' || status === 'drafter_rejected') return 'attention';
  if (status === 'pending_review' || status === 'waiting_drafter_acceptance') return 'waiting';
  if (status === 'closed') return 'final';
  return 'neutral';
}

/** Nomor request `DRQ-YYYY-NNNNNN` dengan tahun WIB. */
export function requestNumber(year: number, sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999)
    throw Error('Sekuens request di luar batas.');
  return `DRQ-${year}-${String(sequence).padStart(6, '0')}`;
}
export const wibYear = (at = Date.now()) => new Date(at + 7 * 3_600_000).getUTCFullYear();

/** Siapa yang boleh melihat request (PRD §4.6): pemohon miliknya, Drafter yang ditugaskan, leader/admin semua. */
export function canSeeRequest(identity: Identity, r: { requesterId: string; drafterId: string | null }) {
  const role = drawingsRole(identity);
  if (!role) return false;
  if (role === 'leader' || role === 'admin') return true;
  return r.requesterId === identity.id || (role === 'drafter' && r.drafterId === identity.id);
}
export type RequestScope = 'mine' | 'assigned' | 'all';
export function requestScopes(identity: Identity): RequestScope[] {
  const role = drawingsRole(identity);
  if (!role) return [];
  const scopes: RequestScope[] = [];
  if (drawingsPermission(identity, 'request.create') !== false) scopes.push('mine');
  if (role === 'drafter') scopes.push('assigned');
  if (role === 'leader' || role === 'admin') scopes.push('all');
  return scopes;
}

const id = z.string().regex(/^[0-9a-f-]{36}$/, 'ID tidak valid.');
const version = z.number().int().min(1);
const hac = z
  .string()
  .transform(normalizeHac)
  .pipe(z.string().min(1, 'HAC/SAC wajib diisi.').max(40, 'HAC/SAC maksimal 40 karakter.'));
export const requestCreateSchema = z
  .object({
    hac,
    description: z
      .string()
      .trim()
      .min(1, 'Description wajib diisi.')
      .max(2000, 'Description maksimal 2000 karakter.'),
    purpose: z
      .string()
      .trim()
      .min(1, 'Keperluan wajib diisi.')
      .max(1000, 'Keperluan maksimal 1000 karakter.'),
    imageIds: z.array(id).max(3, 'Maksimal 3 gambar referensi.').default([]),
  })
  .strict();
export const requestReviewSchema = z
  .object({
    expectedVersion: version,
    decision: z.enum(['assign', 'reject']),
    drafterId: id.optional(),
    note: z.string().trim().max(1000).default(''),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === 'reject' && !v.note)
      ctx.addIssue({ code: 'custom', message: 'Alasan penolakan wajib diisi.' });
    if (v.decision === 'assign' && !v.drafterId)
      ctx.addIssue({ code: 'custom', message: 'Drafter wajib dipilih.' });
  });
export const drafterDecisionSchema = z
  .object({
    expectedVersion: version,
    decision: z.enum(['accept', 'reject']),
    note: z.string().trim().max(1000).default(''),
  })
  .strict()
  .refine((v) => v.decision === 'accept' || !!v.note, 'Alasan penolakan wajib diisi.');
export const requestCancelSchema = z
  .object({ expectedVersion: version, reason: z.string().trim().max(500).default('') })
  .strict();
export const notificationReadSchema = z
  .object({ ids: z.array(id).max(200).optional(), all: z.boolean().optional() })
  .strict()
  .refine((v) => v.all === true || !!v.ids?.length, 'Pilih notifikasi yang dibaca.');

export type RequestListItem = {
  id: string;
  number: string;
  hac: string;
  description: string;
  status: RequestStatus;
  requester: { id: string; name: string };
  drafter: { id: string; name: string } | null;
  drawingId: string | null;
  updatedAt: string;
  createdAt: string;
};
export type RequestDetail = RequestListItem & {
  purpose: string;
  reviewer: { id: string; name: string } | null;
  reviewNote: string;
  drafterNote: string;
  closeReason: string | null;
  closedAt: string | null;
  version: number;
  images: { id: string; name: string }[];
  drawing: { id: string; number: string | null; title: string | null; status: string | null } | null;
  can: { cancel: boolean; review: boolean; drafterDecision: boolean };
};
export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};
export type DrawingsDashboard = {
  year: number;
  currentYear: number;
  final: number;
  inProgress: number | null;
  waiting: number | null;
  rejected: number | null;
  /** Final Drawing terbit per kuartal (revisi Completed, termasuk legacy). */
  series: { quarter: number; released: number; legacy: number }[];
  recent: {
    id: string;
    number: string | null;
    title: string | null;
    revisionNo: string;
    releasedAt: string;
    legacy: boolean;
  }[];
  tasks: number;
};
