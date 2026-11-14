// Drawing Database — alur approval (PRD §4.1–§4.4, K7, K8). Fungsi murni dengan unit test;
// server memeriksa ulang setiap aturan terhadap baris yang dikunci.
import { z } from 'zod';
import { AppError } from './index';
import type { RevisionStatus } from './drawings-model';

export type WorkflowAction =
  | 'submit'
  | 'check.approve'
  | 'check.reject'
  | 'l1.approve'
  | 'l1.reject'
  | 'l2.approve'
  | 'l2.reject'
  | 'cancel';
const fromEditable: readonly RevisionStatus[] = [
  'draft',
  'check_rejected',
  'approval_1_rejected',
  'approval_2_rejected',
];
const table: Record<
  WorkflowAction,
  { from: readonly RevisionStatus[]; to: RevisionStatus | ((hasL2: boolean) => RevisionStatus) }
> = {
  submit: { from: fromEditable, to: 'waiting_check' },
  'check.approve': { from: ['waiting_check'], to: 'waiting_approval_1' },
  'check.reject': { from: ['waiting_check'], to: 'check_rejected' },
  'l1.approve': { from: ['waiting_approval_1'], to: (hasL2) => (hasL2 ? 'waiting_approval_2' : 'completed') },
  'l1.reject': { from: ['waiting_approval_1'], to: 'approval_1_rejected' },
  'l2.approve': { from: ['waiting_approval_2'], to: 'completed' },
  'l2.reject': { from: ['waiting_approval_2'], to: 'approval_2_rejected' },
  cancel: { from: fromEditable, to: 'cancelled' },
};
/** Status berikutnya; transisi lain ditolak 409 INVALID_TRANSITION (PRD §4.1). */
export function nextStatus(from: RevisionStatus, action: WorkflowAction, hasL2 = false): RevisionStatus {
  const rule = table[action];
  if (!rule || !rule.from.includes(from))
    throw new AppError(409, 'Status revisi sudah berubah atau aksi ini tidak berlaku.', 'INVALID_TRANSITION');
  return typeof rule.to === 'function' ? rule.to(hasL2) : rule.to;
}
export function canTransition(from: RevisionStatus, action: WorkflowAction) {
  return table[action].from.includes(from);
}

/**
 * Nomor revisi berikutnya (PRD §4.4): angka → +1, satu huruf → huruf berikutnya,
 * selain itu sufiks `-1` (atau sufiks angka yang ada dinaikkan).
 */
export function nextRevisionNo(current: string) {
  const value = current.trim();
  if (/^\d{1,19}$/.test(value)) return String(Number(value) + 1);
  if (/^[A-Ya-y]$/.test(value)) return String.fromCharCode(value.charCodeAt(0) + 1);
  const suffix = /^(.*)-(\d{1,6})$/.exec(value);
  if (suffix) return `${suffix[1]}-${Number(suffix[2]) + 1}`.slice(0, 20);
  return (value.slice(0, 18) + '-1').slice(0, 20);
}

/**
 * Pengguna yang tidak boleh memutus Check/Approval revisi ini (K8): owner drawing, pembuat revisi
 * dan submitter siklus berjalan. Berlaku juga bagi Admin.
 */
export function makerIds(d: { ownerId: string }, r: { createdById: string; submittedById: string | null }) {
  return new Set([d.ownerId, r.createdById, r.submittedById].filter((v): v is string => !!v));
}
export const approvalLevels = { 0: 'Check', 1: 'Approval L1', 2: 'Final Approval' } as const;
export type ApprovalLevel = keyof typeof approvalLevels;
/** Kandidat role per level approval plan (PRD §4.2). */
export const approverRoles = { 1: ['approver', 'admin'], 2: ['head', 'admin'] } as const;

const id = z.string().regex(/^[0-9a-f-]{36}$/, 'ID tidak valid.');
const version = z.number().int().min(1);
const note = z.string().trim().max(1000, 'Catatan maksimal 1000 karakter.');
const attachments = z.array(id).max(3, 'Maksimal 3 gambar.').default([]);
export const submitSchema = z.object({ expectedVersion: version }).strict();
export const checkDecisionSchema = z
  .object({
    expectedVersion: version,
    decision: z.enum(['approve', 'reject']),
    note: note.default(''),
    attachmentIds: attachments,
    approverL1Id: id.optional(),
    approverL2Id: id.nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === 'reject' && !v.note)
      ctx.addIssue({ code: 'custom', message: 'Catatan reject wajib diisi.' });
    if (v.decision === 'approve' && !v.approverL1Id)
      ctx.addIssue({ code: 'custom', message: 'Approver L1 wajib dipilih.' });
    if (v.decision === 'approve' && v.attachmentIds.length)
      ctx.addIssue({ code: 'custom', message: 'Lampiran hanya untuk reject.' });
  });
export const approvalDecisionSchema = z
  .object({
    expectedVersion: version,
    decision: z.enum(['approve', 'reject']),
    note: note.default(''),
    attachmentIds: attachments,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === 'reject' && !v.note)
      ctx.addIssue({ code: 'custom', message: 'Catatan reject wajib diisi.' });
    if (v.decision === 'approve' && v.attachmentIds.length)
      ctx.addIssue({ code: 'custom', message: 'Lampiran hanya untuk reject.' });
  });
export const approvalPlanSchema = z
  .object({ expectedVersion: version, approverL1Id: id.optional(), approverL2Id: id.nullable().optional() })
  .strict()
  .refine(
    (v) => v.approverL1Id !== undefined || v.approverL2Id !== undefined,
    'Tidak ada perubahan approver.',
  );
export const newRevisionSchema = z
  .object({
    expectedVersion: version,
    revisionNo: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9.-]{1,20}$/, 'Nomor revisi 1–20 karakter: huruf, angka, titik atau tanda hubung.')
      .optional(),
    changeNote: z.string().trim().max(1000).default(''),
  })
  .strict();
export const cancelRevisionSchema = z
  .object({ expectedVersion: version, reason: z.string().trim().min(1, 'Alasan wajib diisi.').max(500) })
  .strict();

export type ApprovalStep = {
  level: 1 | 2;
  assignee: { id: string; name: string };
  assignedBy: { id: string; name: string };
  assignedAt: string;
  /** Assignee nonaktif atau kehilangan role; perlu diganti Draft Leader/Admin. */
  inactive: boolean;
  decided: boolean;
};
export type ApprovalActionView = {
  id: string;
  cycle: number;
  level: ApprovalLevel;
  decision: 'approved' | 'rejected';
  note: string;
  actor: { id: string; name: string };
  actorRole: string;
  attachments: { id: string; name: string }[];
  createdAt: string;
};
export type WorkflowAvailability = {
  submit: boolean;
  check: boolean;
  approveL1: boolean;
  approveL2: boolean;
  reassign: boolean;
  newRevision: boolean;
  cancelRevision: boolean;
  /** Actor punya role pemutus tetapi terhalang maker-checker pada revisi ini. */
  makerBlocked: boolean;
};
export type TaskKind =
  'rejected' | 'draft' | 'waiting_check' | 'approval_l1' | 'approval_l2' | 'inactive_approver';
export type TaskItem = {
  kind: TaskKind;
  drawingId: string;
  revisionId: string;
  number: string | null;
  title: string | null;
  revisionNo: string;
  status: RevisionStatus;
  owner: string;
  updatedAt: string;
  href: string;
};
