import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeDrawing,
  canSeeRevision,
  canSeeWip,
  drawingCreateSchema,
  drawingFileName,
  drawingPermissions,
  drawingUpdateSchema,
  drawingsRoles,
  legacyCreateSchema,
  normalizeHac,
  revisionStatusTone,
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
const drawing = (
  over: Partial<{ ownerId: string; voided: boolean; released: boolean; everSubmitted: boolean }> = {},
) => ({
  ownerId: 'owner',
  voided: false,
  released: false,
  everSubmitted: false,
  releasedRevisionId: null as string | null,
  ...over,
});

test('visibility: viewer sees only released drawings and only the released revision', () => {
  const viewer = as('viewer');
  assert.equal(canSeeDrawing(viewer, drawing()), false);
  const released = { ...drawing({ released: true }), releasedRevisionId: 'r1' };
  assert.equal(canSeeDrawing(viewer, released), true);
  assert.equal(canSeeRevision(viewer, released, 'r1'), true);
  assert.equal(canSeeRevision(viewer, released, 'r2-obsolete-or-wip'), false);
  assert.equal(canSeeDrawing(viewer, { ...released, voided: true }), false);
});

test('visibility: drafter sees own work in progress only; others with wip.read see all', () => {
  assert.equal(canSeeWip(as('drafter', 'owner'), { ownerId: 'owner' }), true);
  assert.equal(canSeeWip(as('drafter', 'other'), { ownerId: 'owner' }), false);
  assert.equal(canSeeDrawing(as('drafter', 'other'), drawing()), false);
  for (const role of ['leader', 'approver', 'head', 'admin'] as const)
    assert.equal(canSeeDrawing(as(role), drawing()), true, role);
  for (const role of drawingsRoles)
    assert.equal(canSeeDrawing(as(role), drawing({ voided: true })), role === 'admin', `void ${role}`);
});

test('permissions follow owner, status and maker rules', () => {
  const draft = { ...drawing(), currentStatus: 'draft' as const };
  assert.equal(drawingPermissions(as('drafter', 'owner'), draft).edit, true);
  assert.equal(drawingPermissions(as('drafter', 'other'), draft).edit, false);
  assert.equal(drawingPermissions(as('admin'), draft).edit, true);
  assert.equal(drawingPermissions(as('leader'), draft).edit, false);
  assert.equal(
    drawingPermissions(as('drafter', 'owner'), { ...draft, currentStatus: 'waiting_check' }).edit,
    false,
  );
  // Void: admin always; owner only before ever submitting or releasing.
  assert.equal(drawingPermissions(as('drafter', 'owner'), draft).void, true);
  assert.equal(drawingPermissions(as('drafter', 'owner'), { ...draft, everSubmitted: true }).void, false);
  assert.equal(drawingPermissions(as('drafter', 'owner'), { ...draft, released: true }).void, false);
  assert.equal(drawingPermissions(as('admin'), { ...draft, released: true }).void, true);
  assert.equal(drawingPermissions(as('leader'), draft).void, false);
  // Correction only for admin after first release; transfer for leader/admin.
  const final = { ...drawing({ released: true }), currentStatus: 'completed' as const };
  assert.equal(drawingPermissions(as('admin'), final).correct, true);
  assert.equal(drawingPermissions(as('drafter', 'owner'), final).correct, false);
  assert.equal(drawingPermissions(as('drafter', 'owner'), final).edit, false);
  assert.equal(drawingPermissions(as('leader'), final).transferOwner, true);
  assert.equal(drawingPermissions(as('approver'), final).transferOwner, false);
  for (const role of drawingsRoles) {
    const p = drawingPermissions(as(role), { ...final, voided: true });
    assert.deepEqual([p.edit, p.correct, p.void, p.transferOwner], [false, false, false, false], role);
  }
});

test('input schemas validate PRD §5 field rules', () => {
  const base = {
    number: ' DWG-001 ',
    title: 'Pump house',
    hac: ' tq.561-bf1 ',
  };
  const uuid = '11111111-2222-4333-8444-555555555555';
  const parsed = drawingCreateSchema.parse(base);
  assert.equal(parsed.number, 'DWG-001');
  assert.equal(parsed.hac, '561-BF1');
  assert.equal(parsed.revisionNo, '0');
  assert.equal(parsed.description, '');
  for (const bad of [
    { ...base, number: '' },
    { ...base, number: 'x'.repeat(101) },
    { ...base, hac: '  ' },
    { ...base, hac: 'X'.repeat(41) },
    { ...base, revisionNo: 'A B' },
    { ...base, revisionNo: 'x'.repeat(21) },
    { ...base, disciplineId: 'nope' },
    // Area tidak dipakai lagi; isian yang tidak dikenal ditolak.
    { ...base, areaId: uuid },
    { ...base, submit: true },
  ])
    assert.equal(drawingCreateSchema.safeParse(bad).success, false, JSON.stringify(bad).slice(0, 60));
  assert.equal(
    legacyCreateSchema.safeParse({
      ...base,
      disciplineId: uuid,
      revisionNo: 'A',
      ownerId: uuid,
      fileId: uuid,
      legacyNote: '',
    }).success,
    false,
    'legacy note required',
  );
  assert.equal(drawingUpdateSchema.safeParse({ title: 'x' }).success, false, 'expectedVersion required');
  assert.equal(normalizeHac(' tq.abc '), 'ABC');
});

test('status tones never add a palette and file names are safe', () => {
  assert.equal(revisionStatusTone('completed'), 'final');
  assert.equal(revisionStatusTone('check_rejected'), 'attention');
  assert.equal(revisionStatusTone('waiting_approval_2'), 'waiting');
  assert.equal(revisionStatusTone('obsolete'), 'muted');
  assert.equal(revisionStatusTone('draft'), 'neutral');
  assert.equal(drawingFileName('DWG/01:A', 'B'), 'DWG_01_A_Rev-B.pdf');
  assert.equal(drawingFileName(null, '0'), 'Drawing_Rev-0.pdf');
});
