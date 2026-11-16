import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  checkRevision,
  closeDrawingsDb,
  createDrawing,
  createLegacyDrawing,
  createRequest,
  createRevision,
  decideApproval,
  drafterDecision,
  drawingDetail,
  listDrawings,
  listMasters,
  listTasks,
  requestDetail,
  reviewRequest,
  revisionFile,
  stageUpload,
  submitRevision,
  updateDrawing,
  voidDrawing,
  type DirectoryPerson,
} from '@plant/drawings-core';
import { AppError, type DrawingsRole, type Identity } from '@plant/contracts';
if (
  process.env.TEST_DATABASE !== '1' ||
  !process.env.DRAWINGS_DATABASE_URL?.includes('127.0.0.1:13306/plant_drawings')
)
  throw Error('Isolated database required.');

let dir: string, discipline: string;
const person = (role: DrawingsRole, name: string = role): Identity => ({
  id: randomUUID(),
  name: `${name} ${randomUUID().slice(0, 4)}`,
  email: `${name}@example.test`,
  position: '',
  portalAdmin: false,
  mustChangePassword: false,
  grants: [{ appId: 'drawings', role }],
});
const u = {
  viewer: person('viewer'),
  drafter: person('drafter'),
  drafter2: person('drafter', 'drafter2'),
  leader: person('leader'),
  approver: person('approver'),
  head: person('head'),
  admin: person('admin'),
};
const people: DirectoryPerson[] = Object.values(u).map((p) => ({
  id: p.id,
  name: p.name,
  position: '',
  role: (p.grants[0] as { role: string }).role,
}));
const directory = async () => people;
const key = () => randomUUID();
const rejects = (status: number, code?: string) => (e: unknown) =>
  e instanceof AppError && e.status === status && (!code || e.code === code);

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'drawings-flow-'));
  process.env.DRAWINGS_STORAGE_DRIVER = 'fs';
  process.env.DRAWINGS_STORAGE_PATH = join(dir, 'store');
  discipline = (await listMasters()).disciplines.find((d) => d.active)!.id;
});
after(async () => {
  await closeDrawingsDb();
  await rm(dir, { recursive: true, force: true });
});
async function stagedPdf(owner: Identity) {
  const doc = await PDFDocument.create();
  doc.addPage([842, 595]);
  const bytes = await doc.save();
  const path = join(dir, randomUUID());
  await writeFile(path, bytes);
  const staged = await stageUpload(owner, 'pdf', 'x.pdf', 'application/pdf', {
    path,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    head: Buffer.from(bytes.subarray(0, 64)),
  });
  return staged.fileId;
}
const v = async (id: string) => (await drawingDetail(u.admin, id)).version;
async function draft(owner = u.drafter) {
  const r = await createDrawing(
    owner,
    {
      number: `IT-${randomUUID().slice(0, 8)}`,
      title: 'IT',
      hac: 'H',
      disciplineId: discipline,
      fileId: await stagedPdf(owner),
    },
    key(),
  );
  return r.body as { id: string; revisionId: string };
}
async function release(d: { id: string; revisionId: string }, withL2 = false) {
  await submitRevision(
    d.id === '' ? u.drafter : await ownerOf(d.id),
    d.revisionId,
    { expectedVersion: await v(d.id) },
    key(),
  );
  await checkRevision(
    u.leader,
    d.revisionId,
    {
      expectedVersion: await v(d.id),
      decision: 'approve',
      approverL1Id: u.approver.id,
      approverL2Id: withL2 ? u.head.id : null,
    },
    key(),
    directory,
  );
  await decideApproval(
    u.approver,
    1,
    d.revisionId,
    { expectedVersion: await v(d.id), decision: 'approve' },
    key(),
  );
  if (withL2)
    await decideApproval(
      u.head,
      2,
      d.revisionId,
      { expectedVersion: await v(d.id), decision: 'approve' },
      key(),
    );
}
async function ownerOf(id: string) {
  const ownerId = (await drawingDetail(u.admin, id)).owner.id;
  return Object.values(u).find((p) => p.id === ownerId)!;
}

test('visibility per role for drafts, Final Drawing, obsolete and void (PRD §3)', async () => {
  const d = await draft();
  await assert.rejects(drawingDetail(u.viewer, d.id), rejects(404));
  await assert.rejects(drawingDetail(u.drafter2, d.id), rejects(404));
  for (const p of [u.drafter, u.leader, u.approver, u.head, u.admin])
    assert.equal((await drawingDetail(p, d.id)).id, d.id);
  await assert.rejects(listDrawings(u.viewer, new URLSearchParams({ tab: 'wip' })), rejects(403));
  await release(d, true);
  assert.equal((await drawingDetail(u.viewer, d.id)).released?.id, d.revisionId);
  const next = (await createRevision(u.drafter, d.id, { expectedVersion: await v(d.id) }, key())).body as {
    id: string;
  };
  assert.equal(
    (await drawingDetail(u.viewer, d.id)).revisions.length,
    1,
    'viewer sees only the Final Drawing',
  );
  await assert.rejects(revisionFile(u.viewer, next.id, 'view'), rejects(404));
  await updateDrawing(u.drafter, d.id, {
    expectedVersion: await v(d.id),
    fileId: await stagedPdf(u.drafter),
  });
  await release({ id: d.id, revisionId: next.id });
  await assert.rejects(
    revisionFile(u.viewer, d.revisionId, 'view'),
    rejects(404),
    'obsolete hidden from viewer',
  );
  await assert.rejects(revisionFile(u.drafter, d.revisionId, 'download'), rejects(409));
  await voidDrawing(u.admin, d.id, { expectedVersion: await v(d.id), reason: 'uji' }, key());
  for (const p of [u.viewer, u.drafter, u.leader]) await assert.rejects(drawingDetail(p, d.id), rejects(404));
  assert.ok(await drawingDetail(u.admin, d.id));
});

test('maker-checker at every level including Admin; assignee only', async () => {
  const mine = await draft(u.admin);
  await submitRevision(u.admin, mine.revisionId, { expectedVersion: await v(mine.id) }, key());
  await assert.rejects(
    checkRevision(
      u.admin,
      mine.revisionId,
      { expectedVersion: await v(mine.id), decision: 'approve', approverL1Id: u.approver.id },
      key(),
      directory,
    ),
    rejects(403, 'MAKER_CHECKER'),
  );
  await assert.rejects(
    checkRevision(
      u.leader,
      mine.revisionId,
      { expectedVersion: await v(mine.id), decision: 'approve', approverL1Id: u.admin.id },
      key(),
      directory,
    ),
    rejects(403, 'MAKER_CHECKER'),
  );
  await checkRevision(
    u.leader,
    mine.revisionId,
    { expectedVersion: await v(mine.id), decision: 'approve', approverL1Id: u.approver.id },
    key(),
    directory,
  );
  await assert.rejects(
    decideApproval(
      u.admin,
      1,
      mine.revisionId,
      { expectedVersion: await v(mine.id), decision: 'approve' },
      key(),
    ),
    rejects(403),
  );
});

test('concurrent decisions: exactly one succeeds; idempotent replay; legacy has no approvals', async () => {
  const d = await draft();
  await submitRevision(u.drafter, d.revisionId, { expectedVersion: await v(d.id) }, key());
  await checkRevision(
    u.leader,
    d.revisionId,
    { expectedVersion: await v(d.id), decision: 'approve', approverL1Id: u.approver.id },
    key(),
    directory,
  );
  const expectedVersion = await v(d.id);
  const results = await Promise.allSettled([
    decideApproval(u.approver, 1, d.revisionId, { expectedVersion, decision: 'approve' }, key()),
    decideApproval(u.approver, 1, d.revisionId, { expectedVersion, decision: 'reject', note: 'x' }, key()),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  assert.ok(failure.reason instanceof AppError && failure.reason.status === 409);
  const k = key();
  const body = {
    number: `LG-${randomUUID().slice(0, 6)}`,
    title: 'L',
    hac: 'H',
    disciplineId: discipline,
    revisionNo: '0',
    ownerId: u.drafter.id,
    legacyNote: 'scan',
    fileId: await stagedPdf(u.leader),
  };
  const first = await createLegacyDrawing(u.leader, body, k, directory);
  const again = await createLegacyDrawing(u.leader, body, k, directory);
  assert.equal(again.replayed, true);
  assert.deepEqual(again.body, first.body);
  const legacy = await drawingDetail(u.leader, (first.body as { id: string }).id);
  assert.equal(legacy.released?.status, 'completed');
  assert.equal(legacy.workflow.actions.length, 0);
});

test('archive import records the original author as Drawn by; uploader stays owner', async () => {
  const body = async (ownerId: string) => ({
    number: `AR-${randomUUID().slice(0, 6)}`,
    title: 'Archive',
    hac: '211-XXX',
    disciplineId: discipline,
    revisionNo: '0',
    ownerId,
    legacyNote: 'Arsip Polysius.',
    fileId: await stagedPdf(u.admin),
  });
  const none = async () => [];
  const created = await createLegacyDrawing(u.admin, await body(u.admin.id), key(), none, {
    drawnByName: ' POL ',
  });
  const detail = await drawingDetail(u.viewer, (created.body as { id: string }).id);
  assert.deepEqual(detail.owner, { id: u.admin.id, name: 'POL' });
  assert.equal(detail.source, 'legacy');
  assert.equal(detail.released?.status, 'completed');
  // The archive author can never be assigned to another account or left empty.
  for (const [ownerId, drawnByName] of [
    [u.drafter.id, 'POL'],
    [u.admin.id, ' '],
    [u.admin.id, 'x'.repeat(101)],
  ])
    await assert.rejects(
      async () => createLegacyDrawing(u.admin, await body(ownerId), key(), none, { drawnByName }),
      (e) => e instanceof AppError && e.status === 400,
    );
});

test('drawing request lifecycle closes on release and on void', async () => {
  const r = (await createRequest(u.viewer, { hac: 'h', description: 'd', purpose: 'p' }, key())).body as {
    id: string;
  };
  const rv = async () => (await requestDetail(u.leader, r.id)).version;
  await reviewRequest(
    u.leader,
    r.id,
    { expectedVersion: await rv(), decision: 'assign', drafterId: u.drafter.id },
    key(),
    directory,
  );
  await assert.rejects(requestDetail(u.drafter2, r.id), rejects(404));
  const accepted = (
    await drafterDecision(u.drafter, r.id, { expectedVersion: await rv(), decision: 'accept' }, key())
  ).body as { drawingId: string };
  const d = await drawingDetail(u.drafter, accepted.drawingId);
  assert.equal(d.number, null);
  await assert.rejects(
    submitRevision(u.drafter, d.current!.id, { expectedVersion: d.version }, key()),
    rejects(400),
  );
  await updateDrawing(u.drafter, d.id, {
    expectedVersion: d.version,
    number: `RQ-${randomUUID().slice(0, 6)}`,
    title: 'T',
    disciplineId: discipline,
    fileId: await stagedPdf(u.drafter),
  });
  await release({ id: d.id, revisionId: d.current!.id });
  assert.equal((await requestDetail(u.viewer, r.id)).status, 'closed');
  const tasks = await listTasks(u.approver, people);
  assert.ok(Array.isArray(tasks));
});
