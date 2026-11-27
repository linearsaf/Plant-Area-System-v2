import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { eq, sql } from 'drizzle-orm';
import {
  saveMaterial,
  saveInventory,
  postMovement,
  createDocument,
  documentDetail,
  listDocuments,
  listMaterials,
  listInventory,
  searchMaterials,
  hecSuggestions,
  materialDetail,
  stockDashboard,
  listLoans,
  loanDetail,
  repayLoan,
  discovery,
  reconcile,
  getConsumablesDb,
  closeConsumablesDb,
  consumablesSchema as s,
  DocumentConflict,
} from '@plant/consumables-core';
import { AppError, type Identity } from '@plant/contracts';
if (
  process.env.TEST_DATABASE !== '1' ||
  !process.env.CONSUMABLES_DATABASE_URL?.includes('127.0.0.1:13306/plant_consumables')
)
  throw Error('Disposable MySQL only.');
const actor: Identity = {
  id: randomUUID(),
  name: 'R22 integration',
  email: 'r22@example.test',
  position: '',
  portalAdmin: false,
  mustChangePassword: false,
  grants: [{ appId: 'consumables', role: 'admin' }],
};
const key = () => randomUUID();
async function fixture(n = 2, legacyIds = false) {
  const fixtureWo = 'WO-' + key();
  const list: Array<{
    id: string;
    source: {
      mmid: string;
      description: string;
      commonName: string;
      aliases: string;
      unit: string;
      sapUnit: string;
      decimalAllowed: boolean;
      packSize: string;
      category: string;
    };
  }> = [];
  for (let j = 0; j < n; j++) {
    const source = {
      mmid: legacyIds ? `LEGACY-${fixtureWo}-${j}` : 'R22-' + key(),
      description: 'SAP Bolt ' + j,
      commonName: 'Baut M16',
      aliases: 'mur, fastener',
      unit: 'PCS',
      sapUnit: 'SET',
      decimalAllowed: false,
      packSize: '2',
      category: 'Synthetic',
    };
    const generatedId = (await saveMaterial(actor, source)).id;
    const id = legacyIds ? 'mat-' + key().slice(0, 20) : generatedId;
    if (legacyIds)
      await getConsumablesDb().update(s.materials).set({ id }).where(eq(s.materials.id, generatedId));
    const stock = await saveInventory(actor, { materialId: id, rack: `AREA-${fixtureWo}` });
    if (legacyIds)
      await getConsumablesDb()
        .update(s.inventory)
        .set({ id: 'inv-' + id })
        .where(eq(s.inventory.id, stock.id));
    await postMovement(
      actor,
      'opening',
      { materialId: id, quantity: '10', reason: 'Fixture', expectedVersion: 1 },
      key(),
    );
    list.push({ id, source });
  }
  const input = {
    hec: ' tq.452-bu1 ',
    wo: fixtureWo,
    lines: list.map((m) => ({ materialId: m.id, quantity: '2' })),
  };
  const quantity = async (id = list[0].id) => (await materialDetail(actor, id)).stock!.quantity;
  return { list, input, quantity };
}
const status = (n: number) => (e: unknown) => e instanceof AppError && e.status === n;
test('existing non-UUID material and inventory IDs support orders, replay and pagination', async () => {
  const f = await fixture(2, true),
    requestKey = key();
  const found = await searchMaterials(actor, new URLSearchParams({ q: f.list[0].source.mmid }));
  assert.equal(found.items[0].id, f.list[0].id);
  const consume = await createDocument(actor, 'consume', f.input, requestKey);
  assert.equal(consume.lines.length, 2);
  assert.equal(await f.quantity(), '8.000000');
  const replay = await createDocument(actor, 'consume', f.input, requestKey);
  assert.equal(replay.document.id, consume.document.id);
  assert.equal(replay.replayed, true);
  assert.equal(await f.quantity(), '8.000000');
  await createDocument(actor, 'return', f.input, key());
  assert.equal(await f.quantity(), '10.000000');
  await createDocument(
    actor,
    'picklist',
    {
      reservationNo: 'LEGACY-RES',
      wo: f.input.wo,
      costCenter: 'TEST',
      lines: f.list.map((m) => ({ materialId: m.id, sapQuantity: '1', materialVersion: 1 })),
    },
    key(),
  );
  assert.equal(await f.quantity(), '12.000000');
  for (const list of [listMaterials, listInventory]) {
    const params = new URLSearchParams({ q: f.input.wo, limit: '1' });
    const first = await list(actor, params);
    assert.equal(first.items.length, 1);
    assert.ok(first.nextCursor);
    params.set('cursor', first.nextCursor);
    const second = await list(actor, params);
    assert.equal(second.items.length, 1);
    assert.notEqual(second.items[0].id, first.items[0].id);
    assert.equal(second.nextCursor, null);
    params.set('cursor', Buffer.from(JSON.stringify({ sort: '', id: '../invalid' })).toString('base64url'));
    await assert.rejects(list(actor, params), status(400));
  }
  await assert.rejects(
    createDocument(
      actor,
      'consume',
      { ...f.input, lines: [{ materialId: 'mat-missing-' + key().slice(0, 8), quantity: '1' }] },
      key(),
    ),
    status(404),
  );
  await assert.rejects(
    createDocument(
      { ...actor, grants: [{ appId: 'consumables', role: 'viewer' }] },
      'consume',
      f.input,
      key(),
    ),
    status(403),
  );
  await assert.rejects(
    createDocument(
      actor,
      'consume',
      { ...f.input, lines: f.list.map((m) => ({ materialId: m.id, quantity: '13' })) },
      key(),
    ),
    (e) => e instanceof DocumentConflict && e.lines.length === 2,
  );
  assert.equal(await f.quantity(), '12.000000');
});
test('R22 multi-item consume is atomic, reports every shortage, and replays normalized payload', async () => {
  const f = await fixture(),
    k = key();
  await assert.rejects(
    createDocument(
      actor,
      'consume',
      { ...f.input, lines: f.list.map((m) => ({ materialId: m.id, quantity: '11' })) },
      k,
    ),
    (e) =>
      e instanceof DocumentConflict &&
      e.lines.length === 2 &&
      e.lines.every((v) => v.available === '10.000000' && v.requested === '11.000000'),
  );
  assert.equal(await f.quantity(), '10.000000');
  assert.equal((await listDocuments(actor, new URLSearchParams({ q: f.input.wo }))).items.length, 0);
  const before = await stockDashboard(actor);
  const result = await createDocument(actor, 'consume', f.input, k);
  assert.equal(result.lines.length, 2);
  assert.equal(result.document.hec, '452-BU1');
  assert.equal(result.document.requesterName, actor.name);
  assert.match(result.document.number, /^R22-CO-\d{4}-\d{6}$/);
  const replay = await createDocument(
    actor,
    'consume',
    { ...f.input, hec: '452-BU1', lines: f.input.lines.map((l) => ({ ...l, quantity: '2.000000' })) },
    k,
  );
  assert.equal(replay.document.id, result.document.id);
  assert.equal(replay.replayed, true);
  await assert.rejects(createDocument(actor, 'consume', { ...f.input, wo: 'changed' }, k), status(409));
  assert.equal(await f.quantity(), '8.000000');
  assert.equal((await documentDetail(actor, result.document.id)).lines[0].commonName, 'Baut M16');
  assert.equal((await hecSuggestions(actor, 'tq.452')).items[0], '452-BU1');
  const dashboard = await stockDashboard({
    ...actor,
    grants: [{ appId: 'consumables', role: 'viewer' }],
  });
  assert.equal(
    dashboard.series.reduce((v, q) => v + q.consume, 0),
    before.series.reduce((v, q) => v + q.consume, 0) + 1,
  );
  assert.equal((await discovery(actor, result.document.number)).items[0].id, result.document.id);
});
test('R22 concurrent orders with reversed lines are deterministic and cannot overdraw', async () => {
  const f = await fixture();
  const body = { ...f.input, lines: f.input.lines.map((l) => ({ ...l, quantity: '7' })) };
  const results = await Promise.allSettled([
    createDocument(actor, 'consume', body, key()),
    createDocument(actor, 'consume', { ...body, lines: [...body.lines].reverse() }, key()),
  ]);
  assert.equal(results.filter((v) => v.status === 'fulfilled').length, 1);
  assert.equal(await f.quantity(), '3.000000');
  const k = key(),
    both = await Promise.all([
      createDocument(actor, 'return', f.input, k),
      createDocument(actor, 'return', f.input, k),
    ]);
  assert.equal(both[0].document.id, both[1].document.id);
  assert.equal(both.filter((v) => v.replayed).length, 1);
  assert.equal(await f.quantity(), '5.000000');
  const documents = await Promise.all(
    Array.from({ length: 8 }, () => createDocument(actor, 'return', f.input, key())),
  );
  const nums = documents.map((d) => Number(d.document.number.split('-').at(-1))).sort((a, b) => a - b);
  assert.equal(new Set(nums).size, 8);
  assert.equal(nums.at(-1)! - nums[0], 7);
});
test('R22 picklist conversion, partial reservation warning, K3 and historical snapshots', async () => {
  const f = await fixture(1),
    materialId = (await saveMaterial(actor, { ...f.list[0].source, mmid: 'NEW-' + key() })).id;
  const input = {
    reservationNo: 'RES-' + key().slice(0, 24),
    wo: 'WO',
    costCenter: ' 40420 ',
    functionalLocation: 'TQ.452-BU1 - SAP description',
    requiredDate: '2026-11-02',
    lines: [{ materialId, sapQuantity: '3', materialVersion: 1 }],
  };
  const receiptKey = key();
  for (const costCenter of [undefined, '', ' \t ', null, 'x'.repeat(41)])
    await assert.rejects(
      createDocument(actor, 'picklist', { ...input, costCenter }, receiptKey),
      status(400),
    );
  assert.equal((await materialDetail(actor, materialId)).stock, null);
  const result = await createDocument(actor, 'picklist', input, receiptKey);
  assert.equal(result.document.costCenter, '40420');
  assert.equal((await documentDetail(actor, result.document.id)).document.costCenter, '40420');
  const replay = await createDocument(actor, 'picklist', { ...input, costCenter: '40420' }, receiptKey);
  assert.equal(replay.document.id, result.document.id);
  assert.equal(replay.replayed, true);
  assert.equal(result.document.lineCount, 1);
  assert.equal(result.document.requiredDate, '2026-11-02');
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0].quantity, '6.000000');
  assert.equal(result.lines[0].sapUnit, 'SET');
  assert.equal(result.lines[0].sapQuantity, '3.000000');
  assert.equal(result.lines[0].packSize, '2.000000');
  const stock = (await materialDetail(actor, materialId)).stock!;
  assert.equal(stock.initialized, true);
  assert.equal(stock.rack, '');
  const ledger = await getConsumablesDb()
    .select()
    .from(s.movements)
    .where(eq(s.movements.materialId, materialId));
  assert.equal(ledger.length, 2);
  assert.equal(ledger.find((v) => v.type === 'opening')?.quantity, '0.000000');
  const again = await createDocument(actor, 'picklist', input, key());
  assert.equal(again.previousDocuments?.[0].id, result.document.id);
  await assert.rejects(
    saveMaterial(actor, { ...f.list[0].source, mmid: 'NEW-invalid', version: 1 }, materialId),
    status(400),
  );
  const master = (await materialDetail(actor, materialId)).material;
  await saveMaterial(
    actor,
    {
      ...f.list[0].source,
      mmid: master.mmid,
      description: 'Changed SAP',
      commonName: 'Changed name',
      packSize: '4',
      version: 1,
    },
    materialId,
  );
  await assert.rejects(createDocument(actor, 'picklist', input, key()), status(409));
  const historical = await documentDetail(actor, result.document.id);
  assert.equal(historical.lines[0].packSize, '2.000000');
  assert.equal(historical.lines[0].commonName, 'Baut M16');
  const uncounted = (await saveMaterial(actor, { ...f.list[0].source, mmid: 'UNCOUNTED-' + key() })).id;
  await saveInventory(actor, { materialId: uncounted });
  await assert.rejects(
    createDocument(actor, 'picklist', { ...input, lines: [{ materialId: uncounted, quantity: '2' }] }, key()),
    (e) => e instanceof DocumentConflict && e.lines[0].error.includes('Belum dihitung'),
  );
  await assert.rejects(
    createDocument(actor, 'picklist', { ...input, lines: [{ materialId: key(), quantity: '2' }] }, key()),
    status(404),
  );
});
test('R22 permissions, malformed quantities, shared stock and ranked search fail closed', async () => {
  const f = await fixture();
  const viewer = {
    ...actor,
    grants: [{ appId: 'consumables' as const, role: 'viewer' as const }],
  };
  const operator = {
    ...viewer,
    grants: [{ appId: 'consumables' as const, role: 'operator' as const }],
  };
  await assert.rejects(createDocument(viewer, 'consume', f.input, key()), status(403));
  await assert.rejects(
    createDocument(operator, 'consume', { ...f.input, requester: { name: 'Other' } }, key()),
    status(403),
  );
  const behalf = await createDocument(
    actor,
    'return',
    { ...f.input, requester: { name: 'Client', nik: '001' } },
    key(),
  );
  assert.equal(behalf.document.channel, 'cashier');
  assert.equal(behalf.document.actorId, actor.id);
  assert.equal(behalf.document.requesterName, 'Client');
  const outside = {
    ...operator,
    grants: [],
  };
  await assert.rejects(documentDetail(outside, behalf.document.id), status(403));
  await assert.rejects(searchMaterials(outside, new URLSearchParams({ q: 'baut' })), status(403));
  await assert.rejects(
    createDocument(actor, 'consume', { ...f.input, lines: [f.input.lines[0], f.input.lines[0]] }, key()),
    status(400),
  );
  for (const quantity of ['0', '-1', '0.1', '1.0000001', '1000000000000'])
    await assert.rejects(
      createDocument(
        actor,
        'consume',
        { ...f.input, lines: [{ materialId: f.list[0].id, quantity }] },
        key(),
      ),
      status(400),
    );
  for (const hec of ['', '452 BU1', '452-BU11'])
    await assert.rejects(createDocument(actor, 'consume', { ...f.input, hec }, key()), status(400));
  const found = await searchMaterials(operator, new URLSearchParams({ q: 'fastener' }));
  assert.ok(found.items.length >= 2);
  assert.ok(found.items.length <= 8);
  assert.equal(found.items[0].quantity.includes('.'), true);
  const exact = await searchMaterials(operator, new URLSearchParams({ q: f.list[0].source.mmid }));
  assert.equal(exact.items[0].id, f.list[0].id);
  const byArea = await searchMaterials(operator, new URLSearchParams({ q: `AREA-${f.input.wo}` }));
  assert.ok(byArea.items.some((item) => item.id === f.list[0].id));
  assert.equal((await searchMaterials(operator, new URLSearchParams({ q: '%' }))).items.length, 0);
  await assert.rejects(searchMaterials(operator, new URLSearchParams({ q: 'baut' }), true), status(403));
});
test('R22 audit failure rolls back document, all balances, auto enrollment, idempotency and sequence', async () => {
  const f = await fixture(),
    c = await mysql.createConnection(process.env.CONSUMABLES_MIGRATION_DATABASE_URL!),
    k = key();
  try {
    await c.query(
      `CREATE TRIGGER r22_fail BEFORE INSERT ON consumables_audit FOR EACH ROW BEGIN IF NEW.actor_id='${actor.id}' AND NEW.action='document.consume' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='R22 injected failure'; END IF; END`,
    );
    await assert.rejects(createDocument(actor, 'consume', f.input, k));
    assert.equal(await f.quantity(), '10.000000');
    assert.equal((await listDocuments(actor, new URLSearchParams({ q: f.input.wo }))).items.length, 0);
  } finally {
    await c.query('DROP TRIGGER IF EXISTS r22_fail');
    await c.end();
  }
  assert.equal((await createDocument(actor, 'consume', f.input, k)).replayed, false);
  const fixtureBefore = Date.now;
  try {
    Date.now = () => new Date('2025-12-31T16:59:59Z').getTime();
    const a = await createDocument(actor, 'return', f.input, key());
    Date.now = () => new Date('2025-12-31T17:00:00Z').getTime();
    const b = await createDocument(actor, 'return', f.input, key());
    assert.ok(a.document.number.includes('-2025-'));
    assert.ok(b.document.number.includes('-2026-'));
  } finally {
    Date.now = fixtureBefore;
  }
  assert.deepEqual((await reconcile(actor)).items, []);
});
test('multi-area stock per MMID, cross-area borrowing rules, split orders and two settlement methods', async () => {
  const mmid = 'LOAN-' + key();
  const matId = (
    await saveMaterial(actor, {
      mmid,
      description: 'Bearing multi-area',
      commonName: 'Bearing Loan Test',
      unit: 'PCS',
      sapUnit: 'PCS',
      decimalAllowed: false,
      category: 'Synthetic',
    })
  ).id;
  const invRmp = (await saveInventory(actor, { materialId: matId, rack: 'RMP' })).id;
  const invRmk1 = (await saveInventory(actor, { materialId: matId, rack: 'RMK 1' })).id;
  // Same material + same Area Kerja still rejected.
  await assert.rejects(saveInventory(actor, { materialId: matId, rack: 'RMP' }), status(409));

  await postMovement(
    actor,
    'opening',
    { materialId: matId, inventoryId: invRmp, quantity: '2', reason: 'Init RMP', expectedVersion: 1 },
    key(),
  );
  await postMovement(
    actor,
    'opening',
    { materialId: matId, inventoryId: invRmk1, quantity: '10', reason: 'Init RMK 1', expectedVersion: 1 },
    key(),
  );
  const detail = await materialDetail(actor, matId);
  assert.equal(detail.stocks.length, 2);

  // Borrowing when own stock (RMP = 2) already suffices (requesting 2 from RMK 1) must be rejected.
  await assert.rejects(
    createDocument(
      actor,
      'consume',
      {
        workArea: 'RMP',
        hec: '452-BU1',
        wo: 'WO-LOAN-BLOCK',
        lines: [{ materialId: matId, inventoryId: invRmk1, quantity: '2' }],
      },
      key(),
    ),
    (e: unknown) => e instanceof DocumentConflict && e.lines[0].error.includes('masih mencukupi'),
  );

  // Split order: RMP has 2 PCS, needs 5 PCS -> takes 2 from RMP + borrows 3 from RMK 1.
  const splitDoc = await createDocument(
    actor,
    'consume',
    {
      workArea: 'RMP',
      hec: '452-BU1',
      wo: 'WO-LOAN-SPLIT',
      lines: [
        { materialId: matId, inventoryId: invRmp, quantity: '2' },
        { materialId: matId, inventoryId: invRmk1, quantity: '3' },
      ],
    },
    key(),
  );
  assert.equal(splitDoc.document.workArea, 'RMP');
  assert.equal(splitDoc.document.borrowCount, 1);
  assert.equal(splitDoc.loans?.length, 1);
  const loan = splitDoc.loans![0];
  assert.equal(loan.borrowerArea, 'RMP');
  assert.equal(loan.lenderArea, 'RMK 1');
  assert.equal(loan.quantity, '3.000000');
  assert.equal(loan.status, 'open');

  // Search for RMP now sees 0 in RMP and RMK 1 (7 PCS) in otherAreas.
  const searched = await searchMaterials(actor, new URLSearchParams({ q: mmid, workArea: 'RMP' }));
  assert.equal(searched.items[0].quantity, '0.000000');
  assert.equal(searched.items[0].otherAreas?.length, 1);
  assert.equal(searched.items[0].otherAreas?.[0].rack, 'RMK 1');
  assert.equal(searched.items[0].otherAreas?.[0].quantity, '7.000000');

  // Partial repayment #1 via physical_return (1 PCS back to RMK 1 without touching RMP).
  const repayKey1 = key();
  const part1 = await repayLoan(
    actor,
    loan.id,
    { method: 'physical_return', quantity: '1', note: 'Sisa tidak terpakai' },
    repayKey1,
  );
  assert.equal(part1.replayed, false);
  assert.equal(part1.loan.status, 'partial');
  assert.equal(part1.loan.returnedQuantity, '1.000000');
  assert.equal(part1.lenderStock?.quantity, '8.000000');
  // Idempotency replay returns identical result without double-adding stock.
  const replay1 = await repayLoan(
    actor,
    loan.id,
    { method: 'physical_return', quantity: '1', note: 'Sisa tidak terpakai' },
    repayKey1,
  );
  assert.equal(replay1.replayed, true);
  assert.equal(replay1.lenderStock?.quantity, '8.000000');

  // Transfer repayment when RMP is still 0 must fail with 409.
  await assert.rejects(repayLoan(actor, loan.id, { method: 'transfer', quantity: '2' }, key()), status(409));

  // Replenish RMP via Return Order (5 PCS), then settle remaining 2 PCS via transfer (RMP -> RMK 1).
  await createDocument(
    actor,
    'return',
    {
      workArea: 'RMP',
      hec: '452-BU1',
      wo: 'WO-LOAN-REPLENISH',
      lines: [{ materialId: matId, inventoryId: invRmp, quantity: '5' }],
    },
    key(),
  );
  const part2 = await repayLoan(
    actor,
    loan.id,
    { method: 'transfer', quantity: '2', note: 'Pelunasan dari stok RMP' },
    key(),
  );
  assert.equal(part2.loan.status, 'settled');
  assert.equal(part2.loan.remainingQuantity, '0.000000');
  assert.equal(part2.borrowerStock?.quantity, '3.000000');
  assert.equal(part2.lenderStock?.quantity, '10.000000');
  assert.equal((await loanDetail(actor, loan.id)).repayments.length, 2);
  assert.ok(
    (await listLoans(actor, new URLSearchParams({ status: 'settled', q: loan.number }))).items.length >= 1,
  );
  assert.deepEqual((await reconcile(actor)).items, []);
});
test('Umum R22 shared pool (explicit & default Picklist blank rack) can be consumed without loans', async () => {
  const mmidExplicit = 'SHARED-EX-' + key();
  const matExplicit = (
    await saveMaterial(actor, {
      mmid: mmidExplicit,
      description: 'Karung plastik 50 kg',
      unit: 'PCS',
      sapUnit: 'PCS',
      decimalAllowed: false,
    })
  ).id;
  const invExplicit = (await saveInventory(actor, { materialId: matExplicit, rack: 'Umum R22' })).id;
  await postMovement(
    actor,
    'opening',
    {
      materialId: matExplicit,
      inventoryId: invExplicit,
      quantity: '10',
      reason: 'Stok bersama',
      expectedVersion: 1,
    },
    key(),
  );

  // Material received via default Picklist (blank workArea -> K3 auto-enroll with rack = '').
  const mmidPicklist = 'SHARED-PL-' + key();
  const matPicklist = (
    await saveMaterial(actor, {
      mmid: mmidPicklist,
      description: 'Ember plastik 20L',
      unit: 'PCS',
      sapUnit: 'PCS',
      decimalAllowed: false,
    })
  ).id;
  const sharedPicklist = await createDocument(
    actor,
    'picklist',
    {
      wo: 'WO-SHARED-PL',
      costCenter: '40420',
      lines: [{ materialId: matPicklist, quantity: '8' }],
    },
    key(),
  );
  assert.equal(sharedPicklist.document.reservationNo, '');
  assert.equal(sharedPicklist.document.equipmentNo, '');
  assert.equal(sharedPicklist.previousDocuments?.length ?? 0, 0);

  // Filter ?area=Umum R22 must match both explicit 'Umum R22' and blank rack '' rows.
  const listedExplicit = await listInventory(
    actor,
    new URLSearchParams({ area: 'Umum R22', q: mmidExplicit }),
  );
  assert.equal(listedExplicit.items.length, 1);
  const listedBlank = await listInventory(actor, new URLSearchParams({ area: 'Umum R22', q: mmidPicklist }));
  assert.equal(listedBlank.items.length, 1);
  assert.equal(listedBlank.items[0].rack, '');

  // Search from RMP promotes shared stock directly as primary stock.
  const searchExplicit = await searchMaterials(
    actor,
    new URLSearchParams({ q: mmidExplicit, workArea: 'RMP' }),
  );
  assert.equal(searchExplicit.items[0].rack, 'Umum R22');
  assert.equal(searchExplicit.items[0].quantity, '10.000000');

  const searchBlank = await searchMaterials(actor, new URLSearchParams({ q: mmidPicklist, workArea: 'RMP' }));
  assert.equal(searchBlank.items[0].rack, 'Umum R22');
  assert.equal(searchBlank.items[0].quantity, '8.000000');

  // RMP consumes both shared items directly -> zero cross-area loans created.
  const consumed = await createDocument(
    actor,
    'consume',
    {
      workArea: 'RMP',
      hec: '452-BU1',
      wo: 'WO-SHARED-CONSUME',
      lines: [
        { materialId: matExplicit, inventoryId: invExplicit, quantity: '3' },
        { materialId: matPicklist, inventoryId: searchBlank.items[0].inventoryId!, quantity: '2' },
      ],
    },
    key(),
  );
  assert.equal(consumed.document.workArea, 'RMP');
  assert.equal(consumed.document.borrowCount, 0);
  assert.equal(consumed.loans?.length ?? 0, 0);
  assert.equal(consumed.lines[0].borrowedFromArea, '');
  assert.equal(consumed.lines[1].borrowedFromArea, '');
  assert.equal(consumed.lines[0].workArea, 'Umum R22');
  assert.equal(consumed.lines[1].workArea, 'Umum R22');
  assert.deepEqual((await reconcile(actor)).items, []);
});
after(closeConsumablesDb);
