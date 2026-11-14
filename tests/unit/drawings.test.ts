import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appCatalog,
  canConsume,
  canDraw,
  canOpenDrawingsSection,
  drawingsNavigation,
  drawingsPermission,
  drawingsPermissions,
  drawingsRole,
  drawingsRoles,
  drawingsSections,
  hasPermission,
  type DrawingsRole,
  type Grant,
  type Identity,
} from '@plant/contracts';

const person = (grants: Grant[], extra: Partial<Identity> = {}): Identity => ({
  id: 'u1',
  name: 'Fixture',
  email: 'fixture@example.test',
  position: '',
  portalAdmin: false,
  mustChangePassword: false,
  grants,
  ...extra,
});
const as = (role: DrawingsRole, extra: Partial<Identity> = {}) =>
  person([{ appId: 'drawings', role }], extra);

test('drawings catalog entry is active with path and portal summary', () => {
  const app = appCatalog.find((a) => a.id === 'drawings');
  assert.ok(app);
  assert.equal(app.status, 'active');
  assert.equal('path' in app && app.path, '/drawings');
  assert.equal('portalSummary' in app && app.portalSummary, '/drawings/api/portal-summary');
});

test('no grant, other app grants, portal admin or password change never grant drawings access', () => {
  for (const identity of [
    person([]),
    person([{ appId: 'consumables', role: 'admin' }]),
    person([{ appId: 'bag-filter', role: 'admin', equipment: ['561-BF1'] }]),
    person([], { portalAdmin: true }),
    as('admin', { mustChangePassword: true }),
    person([{ appId: 'drawings', role: 'superuser' as DrawingsRole }]),
  ]) {
    assert.equal(drawingsRole(identity), null);
    assert.equal(canDraw(identity, 'read'), false);
    for (const action of Object.keys(drawingsPermissions) as (keyof typeof drawingsPermissions)[])
      assert.equal(drawingsPermission(identity, action), false);
    assert.deepEqual(drawingsNavigation(identity), []);
  }
});

test('permission matrix matches PRD §3', () => {
  const expected: Record<string, Record<DrawingsRole, boolean | string>> = {
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
    'drawing.edit_submit': {
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
  };
  for (const [action, row] of Object.entries(expected))
    for (const role of drawingsRoles)
      assert.equal(
        drawingsPermission(as(role), action as keyof typeof drawingsPermissions),
        row[role],
        `${action} for ${role}`,
      );
});

test('sidebar navigation follows role (PRD §9)', () => {
  const labels = (role: DrawingsRole) => drawingsNavigation(as(role)).map((n) => n.label);
  assert.deepEqual(labels('viewer'), ['Ringkasan', 'Drawing Library', 'Drawing Requests']);
  assert.deepEqual(labels('drafter'), [
    'Ringkasan',
    'Drawing Library',
    'Tugas saya',
    'Drawing Requests',
    'Create Drawing',
  ]);
  assert.deepEqual(labels('leader'), [
    'Ringkasan',
    'Drawing Library',
    'Tugas saya',
    'Drawing Requests',
    'Upload Old Drawing',
  ]);
  for (const role of ['approver', 'head'] as const)
    assert.deepEqual(labels(role), ['Ringkasan', 'Drawing Library', 'Tugas saya', 'Drawing Requests']);
  assert.deepEqual(labels('admin'), [
    'Ringkasan',
    'Drawing Library',
    'Tugas saya',
    'Drawing Requests',
    'Create Drawing',
    'Upload Old Drawing',
    'Pengelolaan',
    'Audit',
  ]);
  assert.ok(drawingsNavigation(as('admin')).every((n) => n.href.startsWith('/drawings')));
  assert.equal(drawingsNavigation(as('admin'))[0].href, '/drawings');
});

test('section access mirrors navigation and rejects unknown sections', () => {
  for (const role of drawingsRoles) {
    const identity = as(role);
    const allowed = new Set(drawingsNavigation(identity).map((n) => n.href));
    for (const section of drawingsSections)
      assert.equal(canOpenDrawingsSection(identity, section), allowed.has(`/drawings/${section}`));
    assert.equal(canOpenDrawingsSection(identity, 'unknown'), false);
    assert.equal(canOpenDrawingsSection(identity, ''), false);
  }
});

test('drawings grant does not change Bag Filter or Consumable Room permissions', () => {
  const identity = as('admin');
  assert.equal(hasPermission(identity, 'read'), false);
  assert.equal(canConsume(identity, 'read'), false);
});
