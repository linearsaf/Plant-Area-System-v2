import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeRequest,
  drafterDecisionSchema,
  requestCreateSchema,
  requestNumber,
  requestReviewSchema,
  requestScopes,
  wibYear,
  type DrawingsRole,
  type Identity,
} from '@plant/contracts';

const as = (role: DrawingsRole, id = 'me'): Identity => ({
  id,
  name: role,
  email: `${role}@example.test`,
  position: '',
  portalAdmin: false,
  mustChangePassword: false,
  grants: [{ appId: 'drawings', role }],
});

test('request number is DRQ-YYYY-NNNNNN with WIB year', () => {
  assert.equal(requestNumber(2026, 1), 'DRQ-2026-000001');
  assert.equal(requestNumber(2026, 123456), 'DRQ-2026-123456');
  assert.throws(() => requestNumber(2026, 0));
  assert.throws(() => requestNumber(2026, 1_000_000));
  // 31 Dec 2026 18:00 UTC is already 1 Jan 2027 WIB.
  assert.equal(wibYear(Date.parse('2026-12-31T18:00:00Z')), 2027);
  assert.equal(wibYear(Date.parse('2026-12-31T16:59:00Z')), 2026);
});

test('request visibility: requester own, assigned drafter, leader/admin all (PRD §4.6)', () => {
  const r = { requesterId: 'req', drafterId: 'dr' };
  assert.equal(canSeeRequest(as('viewer', 'req'), r), true);
  assert.equal(canSeeRequest(as('viewer', 'other'), r), false);
  assert.equal(canSeeRequest(as('approver', 'other'), r), false);
  assert.equal(canSeeRequest(as('drafter', 'dr'), r), true);
  assert.equal(canSeeRequest(as('drafter', 'other'), r), false);
  assert.equal(canSeeRequest(as('leader', 'other'), r), true);
  assert.equal(canSeeRequest(as('admin', 'other'), r), true);
});

test('request scopes follow role', () => {
  assert.deepEqual(requestScopes(as('viewer')), ['mine']);
  assert.deepEqual(requestScopes(as('approver')), ['mine']);
  assert.deepEqual(requestScopes(as('head')), ['mine']);
  assert.deepEqual(requestScopes(as('drafter')), ['assigned']);
  assert.deepEqual(requestScopes(as('leader')), ['all']);
  assert.deepEqual(requestScopes(as('admin')), ['mine', 'all']);
});

test('request schemas: HAC normalized, description/purpose required, max 3 images, reasons required', () => {
  const ok = requestCreateSchema.parse({ hac: ' tq.561-bf1 ', description: 'Pompa', purpose: 'Overhaul' });
  assert.equal(ok.hac, '561-BF1');
  assert.deepEqual(ok.imageIds, []);
  const id = '11111111-2222-4333-8444-555555555555';
  for (const bad of [
    { hac: '', description: 'x', purpose: 'y' },
    { hac: 'H', description: '', purpose: 'y' },
    { hac: 'H', description: 'x', purpose: '' },
    { hac: 'H', description: 'x', purpose: 'y', imageIds: [id, id, id, id] },
    { hac: 'H', description: 'x', purpose: 'y', areaId: id },
  ])
    assert.equal(requestCreateSchema.safeParse(bad).success, false, JSON.stringify(bad));
  assert.equal(requestReviewSchema.safeParse({ expectedVersion: 1, decision: 'reject' }).success, false);
  assert.equal(requestReviewSchema.safeParse({ expectedVersion: 1, decision: 'assign' }).success, false);
  assert.equal(
    requestReviewSchema.safeParse({ expectedVersion: 1, decision: 'assign', drafterId: id }).success,
    true,
  );
  assert.equal(drafterDecisionSchema.safeParse({ expectedVersion: 1, decision: 'reject' }).success, false);
  assert.equal(drafterDecisionSchema.safeParse({ expectedVersion: 1, decision: 'accept' }).success, true);
});
