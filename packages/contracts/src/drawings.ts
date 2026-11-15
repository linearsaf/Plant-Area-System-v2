import type { Identity } from './index';

// Drawing Database v1 — role, grant dan izin (PRD §3). Fungsi di sini murni dan
// dipakai bersama oleh Auth (verify), aplikasi /drawings dan UI shell.

export const drawingsRoles = ['viewer', 'drafter', 'leader', 'approver', 'head', 'admin'] as const;
export type DrawingsRole = (typeof drawingsRoles)[number];
export type DrawingsGrant = { appId: 'drawings'; role: DrawingsRole };

export const drawingsRoleLabels: Record<DrawingsRole, string> = {
  viewer: 'Viewer',
  drafter: 'Drafter',
  leader: 'Draft Leader',
  approver: 'Approver L1',
  head: 'Head',
  admin: 'Admin',
};

export const drawingsRoleDescriptions: Record<DrawingsRole, string> = {
  viewer: 'Membaca, print dan download Final Drawing; membuat Drawing Request',
  drafter: 'Membuat drawing, mengedit dan submit draft miliknya, menjawab assignment',
  leader: 'Check, menyusun approval plan, review request, Upload Old Drawing',
  approver: 'Approval level 1 untuk revisi yang ditugaskan; membuat Drawing Request',
  head: 'Final Approval untuk revisi yang ditugaskan; membuat Drawing Request',
  admin: 'Seluruh hak operasional, void, master, audit; tetap tunduk pada maker-checker',
};

export const isDrawingsRole = (value: unknown): value is DrawingsRole =>
  typeof value === 'string' && (drawingsRoles as readonly string[]).includes(value);

/**
 * Nilai izin per role:
 * - `true`/`false`: boleh atau tidak berdasarkan role saja.
 * - `'own'`: hanya untuk drawing yang dimiliki (owner = Drawn by).
 * - `'own_unsubmitted'`: hanya drawing miliknya yang belum pernah di-submit.
 * - `'assigned'`: hanya bila ditugaskan pada revisi/request tersebut.
 * Kondisi `own`/`assigned` diperiksa service terhadap data; `canDraw` hanya menjawab
 * apakah role tersebut dapat memenuhi syarat aksi.
 */
export type DrawingsPermissionValue = boolean | 'own' | 'own_unsubmitted' | 'assigned';
export const drawingsPermissions = {
  'final.read': { viewer: true, drafter: true, leader: true, approver: true, head: true, admin: true },
  'wip.read': { viewer: false, drafter: 'own', leader: true, approver: true, head: true, admin: true },
  'request.create': {
    viewer: true,
    drafter: false,
    leader: false,
    approver: true,
    head: true,
    admin: true,
  },
  'request.review': {
    viewer: false,
    drafter: false,
    leader: true,
    approver: false,
    head: false,
    admin: true,
  },
  'request.drafter_decision': {
    viewer: false,
    drafter: 'assigned',
    leader: false,
    approver: false,
    head: false,
    admin: false,
  },
  'drawing.create': {
    viewer: false,
    drafter: true,
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  'drawing.edit_submit': {
    viewer: false,
    drafter: 'own',
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  'revision.create': {
    viewer: false,
    drafter: 'own',
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  'revision.cancel': {
    viewer: false,
    drafter: 'own',
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  'revision.check': {
    viewer: false,
    drafter: false,
    leader: true,
    approver: false,
    head: false,
    admin: true,
  },
  'revision.reassign_approver': {
    viewer: false,
    drafter: false,
    leader: true,
    approver: false,
    head: false,
    admin: true,
  },
  'revision.approve_l1': {
    viewer: false,
    drafter: false,
    leader: false,
    approver: 'assigned',
    head: false,
    admin: 'assigned',
  },
  'revision.approve_l2': {
    viewer: false,
    drafter: false,
    leader: false,
    approver: false,
    head: 'assigned',
    admin: 'assigned',
  },
  'drawing.legacy_upload': {
    viewer: false,
    drafter: false,
    leader: true,
    approver: false,
    head: false,
    admin: true,
  },
  'drawing.transfer_owner': {
    viewer: false,
    drafter: false,
    leader: true,
    approver: false,
    head: false,
    admin: true,
  },
  'drawing.void': {
    viewer: false,
    drafter: 'own_unsubmitted',
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  'admin.manage': {
    viewer: false,
    drafter: false,
    leader: false,
    approver: false,
    head: false,
    admin: true,
  },
  tasks: { viewer: false, drafter: true, leader: true, approver: true, head: true, admin: true },
} as const satisfies Record<string, Record<DrawingsRole, DrawingsPermissionValue>>;
export type DrawingsAction = keyof typeof drawingsPermissions;
export const drawingsActions = Object.keys(drawingsPermissions) as DrawingsAction[];

/** Role Drawing Database milik identitas, atau `null` bila tidak ada grant yang berlaku. */
export function drawingsRole(identity: Identity): DrawingsRole | null {
  if (identity.mustChangePassword) return null;
  const grant = identity.grants.find((g) => g.appId === 'drawings');
  return grant && isDrawingsRole(grant.role) ? grant.role : null;
}

/** Nilai izin mentah untuk aksi; `false` bila tanpa grant atau aksi tidak dikenal. */
export function drawingsPermission(identity: Identity, action: DrawingsAction): DrawingsPermissionValue {
  const role = drawingsRole(identity);
  if (!role || !Object.hasOwn(drawingsPermissions, action)) return false;
  return drawingsPermissions[action][role];
}

/**
 * Apakah role pengguna dapat melakukan aksi, setidaknya untuk sebagian data.
 * Gunakan `drawingsPermission` bila kondisi `own`/`assigned` perlu diperiksa.
 */
export function canDraw(identity: Identity, action: DrawingsAction | 'read') {
  return drawingsPermission(identity, action === 'read' ? 'final.read' : action) !== false;
}

export type DrawingsNavItem = { key: string; label: string; href: string };
const navigation: { key: string; label: string; path: string; action: DrawingsAction }[] = [
  { key: 'summary', label: 'Ringkasan', path: '', action: 'final.read' },
  { key: 'library', label: 'Drawing Library', path: '/library', action: 'final.read' },
  { key: 'tasks', label: 'Tugas saya', path: '/tasks', action: 'tasks' },
  { key: 'requests', label: 'Drawing Requests', path: '/requests', action: 'final.read' },
  { key: 'new', label: 'Create Drawing', path: '/new', action: 'drawing.create' },
  { key: 'legacy', label: 'Upload Old Drawing', path: '/legacy', action: 'drawing.legacy_upload' },
  { key: 'manage', label: 'Pengelolaan', path: '/manage', action: 'admin.manage' },
  { key: 'audit', label: 'Audit', path: '/audit', action: 'admin.manage' },
];
export const drawingsSections = navigation.filter((n) => n.path).map((n) => n.path.slice(1));

/** Menu sidebar Drawing Database sesuai role (PRD §9). Kosong bila tanpa akses. */
export function drawingsNavigation(identity: Identity): DrawingsNavItem[] {
  return navigation
    .filter((n) => canDraw(identity, n.action))
    .map(({ key, label, path }) => ({ key, label, href: '/drawings' + path }));
}

/** Apakah bagian halaman (`library`, `tasks`, …) boleh dibuka role pengguna. */
export function canOpenDrawingsSection(identity: Identity, section: string) {
  const item = navigation.find((n) => n.path === '/' + section);
  return !!item && canDraw(identity, item.action);
}
