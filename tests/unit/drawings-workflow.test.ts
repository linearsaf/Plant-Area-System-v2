import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  approvalDecisionSchema,
  approvalPlanSchema,
  canTransition,
  checkDecisionSchema,
  makerIds,
  nextRevisionNo,
  nextStatus,
  revisionStatuses,
  type RevisionStatus,
  type WorkflowAction,
} from '@plant/contracts';

test('transition table follows PRD §4.1', () => {
  const ok: [RevisionStatus, WorkflowAction, boolean, RevisionStatus][] = [
    ['draft', 'submit', false, 'waiting_check'],
    ['check_rejected', 'submit', false, 'waiting_check'],
    ['approval_1_rejected', 'submit', false, 'waiting_check'],
    ['approval_2_rejected', 'submit', false, 'waiting_check'],
    ['waiting_check', 'check.approve', false, 'waiting_approval_1'],
    ['waiting_check', 'check.reject', false, 'check_rejected'],
    ['waiting_approval_1', 'l1.approve', true, 'waiting_approval_2'],
    ['waiting_approval_1', 'l1.approve', false, 'completed'],
    ['waiting_approval_1', 'l1.reject', false, 'approval_1_rejected'],
    ['waiting_approval_2', 'l2.approve', false, 'completed'],
    ['waiting_approval_2', 'l2.reject', false, 'approval_2_rejected'],
    ['draft', 'cancel', false, 'cancelled'],
    ['approval_2_rejected', 'cancel', false, 'cancelled'],
  ];
  for (const [from, action, hasL2, to] of ok)
    assert.equal(nextStatus(from, action, hasL2), to, `${from} ${action}`);
});

test('every other transition is rejected with 409 INVALID_TRANSITION', () => {
  const actions: WorkflowAction[] = [
    'submit',
    'check.approve',
    'check.reject',
    'l1.approve',
    'l1.reject',
    'l2.approve',
    'l2.reject',
    'cancel',
  ];
  let rejected = 0;
  for (const from of revisionStatuses)
    for (const action of actions) {
      if (canTransition(from, action)) continue;
      rejected++;
      assert.throws(
        () => nextStatus(from, action),
        (e) => e instanceof AppError && e.status === 409 && e.code === 'INVALID_TRANSITION',
      );
    }
  assert.ok(rejected > 50);
  for (const terminal of ['completed', 'obsolete', 'cancelled'] as const)
    for (const action of actions)
      assert.equal(canTransition(terminal, action), false, `${terminal} ${action}`);
});

test('next revision number: number +1, next letter, otherwise -1 suffix', () => {
  assert.equal(nextRevisionNo('0'), '1');
  assert.equal(nextRevisionNo('9'), '10');
  assert.equal(nextRevisionNo('A'), 'B');
  assert.equal(nextRevisionNo('c'), 'd');
  assert.equal(nextRevisionNo('Z'), 'Z-1');
  assert.equal(nextRevisionNo('B.2'), 'B.2-1');
  assert.equal(nextRevisionNo('A-1'), 'A-2');
  assert.ok(nextRevisionNo('X'.repeat(20)).length <= 20);
});

test('maker-checker set contains owner, revision creator and current submitter', () => {
  const set = makerIds({ ownerId: 'owner' }, { createdById: 'creator', submittedById: 'submitter' });
  assert.deepEqual([...set].sort(), ['creator', 'owner', 'submitter']);
  assert.deepEqual([...makerIds({ ownerId: 'a' }, { createdById: 'a', submittedById: null })], ['a']);
});

test('decision schemas: reject needs a note, approve needs L1, attachments only on reject (max 3)', () => {
  const id = '11111111-2222-4333-8444-555555555555';
  assert.equal(checkDecisionSchema.safeParse({ expectedVersion: 1, decision: 'reject' }).success, false);
  assert.equal(
    checkDecisionSchema.safeParse({ expectedVersion: 1, decision: 'reject', note: 'Salah skala' }).success,
    true,
  );
  assert.equal(checkDecisionSchema.safeParse({ expectedVersion: 1, decision: 'approve' }).success, false);
  assert.equal(
    checkDecisionSchema.safeParse({ expectedVersion: 1, decision: 'approve', approverL1Id: id }).success,
    true,
  );
  assert.equal(
    checkDecisionSchema.safeParse({
      expectedVersion: 1,
      decision: 'approve',
      approverL1Id: id,
      attachmentIds: [id],
    }).success,
    false,
  );
  assert.equal(
    approvalDecisionSchema.safeParse({
      expectedVersion: 1,
      decision: 'reject',
      note: 'x',
      attachmentIds: [id, id, id, id],
    }).success,
    false,
  );
  assert.equal(
    approvalDecisionSchema.safeParse({ expectedVersion: 1, decision: 'reject', note: ' '.repeat(3) }).success,
    false,
  );
  assert.equal(
    approvalDecisionSchema.safeParse({ expectedVersion: 1, decision: 'reject', note: 'x'.repeat(1001) })
      .success,
    false,
  );
  assert.equal(approvalPlanSchema.safeParse({ expectedVersion: 1 }).success, false);
  assert.equal(approvalPlanSchema.safeParse({ expectedVersion: 1, approverL2Id: null }).success, true);
});
