import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decimalUnits,
  decimalString,
  formatQuantity,
  localDecimal,
  canConsume,
  normalizeHec,
  HEC_PATTERN,
  normalizeAliases,
  sapToR22,
  validateCountQuantity,
  validateStockQuantity,
  canonicalDocumentPayload,
  allowsDecimals,
  costCenterLabel,
  R22_COST_CENTERS,
  R22_SHARED_AREA,
  R22_WORK_AREAS,
  isSharedWorkArea,
  workAreaLabel,
  AppError,
  type Identity,
} from '@plant/contracts';
import { parseCatalog } from '@plant/consumables-core/import';
import { createDocument, saveInventory, postMovement } from '@plant/consumables-core';

test('material references reject malformed IDs before accessing persistence', async () => {
  const actor: Identity = {
    id: 'material-validation',
    name: 'Validation',
    email: 'validation@example.test',
    position: '',
    portalAdmin: false,
    mustChangePassword: false,
    grants: [{ appId: 'consumables', role: 'admin' }],
  };
  for (const materialId of ['', 'x'.repeat(37), 'mat/001', ' mat-001', "mat-001';--", null, 1]) {
    const invalid = (e: unknown) =>
      e instanceof AppError && e.status === 400 && e.message === 'ID tidak valid.';
    await assert.rejects(saveInventory(actor, { materialId }), invalid);
    await assert.rejects(
      postMovement(
        actor,
        'opening',
        { materialId, quantity: '1', reason: 'Test', expectedVersion: 1 },
        'validation-key',
      ),
      invalid,
    );
    for (const type of ['consume', 'return', 'picklist'] as const)
      await assert.rejects(
        createDocument(
          actor,
          type,
          type === 'picklist'
            ? {
                reservationNo: 'RES',
                wo: 'WO',
                costCenter: 'TEST',
                lines: [{ materialId, sapQuantity: '1' }],
              }
            : { hec: '361-CV1', lines: [{ materialId, quantity: '1' }] },
          'validation-key',
        ),
        type === 'picklist' ? (e) => e instanceof AppError && e.status === 400 : invalid,
      );
  }
});

test('picklist requires a nonblank Cost Center before accessing persistence', async () => {
  const actor: Identity = {
    id: 'cost-center-validation',
    name: 'Validation',
    email: 'validation@example.test',
    position: '',
    portalAdmin: false,
    mustChangePassword: false,
    grants: [{ appId: 'consumables', role: 'storekeeper' }],
  };
  const input = {
    wo: 'WO-VALIDATION',
    lines: [{ materialId: '8f3345f3-50a5-48fb-bbc4-3596711c41a7', quantity: '1' }],
  };
  for (const patch of [
    {},
    { costCenter: '' },
    { costCenter: ' \t\n ' },
    { costCenter: null },
    { costCenter: 40420 },
    { costCenter: 'x'.repeat(41) },
  ])
    await assert.rejects(
      createDocument(actor, 'picklist', { ...input, ...patch }, 'cost-center-test'),
      (e) => e instanceof AppError && e.status === 400,
    );
});
test('fixed-point quantities preserve fractions, localization and overflow boundaries', () => {
  assert.equal(decimalString(decimalUnits('0.1') + decimalUnits('0.2')), '0.300000');
  assert.equal(decimalString(decimalUnits('12.125') * 3n), '36.375000');
  assert.equal(formatQuantity('1234.500000'), '1.234,5');
  assert.equal(localDecimal(' 0,125 '), '0.125');
  assert.equal(decimalString(decimalUnits('999999999999.999999')), '999999999999.999999');
  for (const v of ['1.0000001', '1000000000000', '-1', '1e3', NaN, 0.1, '1,2', 'Infinity'])
    assert.throws(() => decimalUnits(v));
  assert.throws(() => decimalString(decimalUnits('999999999999.999999') + 1n));
});
test('consumable permissions are app-specific, shared within R22 and fail closed', () => {
  const actor = {
    id: 'x',
    name: 'x',
    email: 'x',
    position: 'Engineer',
    portalAdmin: true,
    mustChangePassword: false,
    grants: [],
  } as Identity;
  assert.equal(canConsume(actor, 'manage'), false);
  for (const role of ['viewer', 'operator', 'storekeeper', 'admin'] as const) {
    actor.grants = [{ appId: 'consumables', role }];
    assert.equal(canConsume(actor, 'read'), true);
    assert.equal(canConsume(actor, 'issue'), role !== 'viewer');
    assert.equal(canConsume(actor, 'receive'), role === 'storekeeper' || role === 'admin');
    assert.equal(canConsume(actor, 'return'), role !== 'viewer');
    assert.equal(canConsume(actor, 'onbehalf'), role === 'storekeeper' || role === 'admin');
    assert.equal(canConsume(actor, 'manage'), role === 'admin');
    assert.equal(canConsume(actor, 'invented' as never), false);
  }
  actor.mustChangePassword = true;
  assert.equal(canConsume(actor, 'read'), false);
});

test('R22 HAC/SAC and aliases normalize consistently without accepting malformed locations', () => {
  assert.equal(normalizeHec(' tq.452-bu1 '), '452-BU1');
  for (const v of ['452-BU1', '123-ABC']) assert.ok(HEC_PATTERN.test(normalizeHec(v)));
  for (const v of ['', '45-BU1', '452-BU11', '452 BU1', 'TQ.TQ.452-BU1'])
    assert.ok(!HEC_PATTERN.test(normalizeHec(v)));
  assert.equal(normalizeAliases(' Baut , mur, BAUT,, Mur M16 '), 'Baut, mur, Mur M16');
  assert.throws(() => normalizeAliases('x'.repeat(41)));
  assert.throws(() => normalizeAliases(Array.from({ length: 11 }, (_, i) => 'alias' + i).join(',')));
});
test('Consume and Return validation use HAC/SAC while retaining the compatible payload', async () => {
  const actor: Identity = {
    id: 'asset-code-validation',
    name: 'Validation',
    email: 'validation@example.test',
    position: '',
    portalAdmin: false,
    mustChangePassword: false,
    grants: [{ appId: 'consumables', role: 'operator' }],
  };
  for (const type of ['consume', 'return'] as const)
    for (const hec of ['', '45-BU1', '452 BU1'])
      await assert.rejects(
        createDocument(
          actor,
          type,
          { hec, lines: [{ materialId: '8f3345f3-50a5-48fb-bbc4-3596711c41a7', quantity: '1' }] },
          'asset-code-test',
        ),
        (e) =>
          e instanceof AppError &&
          e.status === 400 &&
          e.message === 'HAC/SAC wajib dengan format XXX-XXX, contoh 452-BU1.',
      );
});

test('R22 SAP conversion is exact, bounded and respects count units', () => {
  const m = { unit: 'PCS', sapUnit: 'SET', packSize: '2', decimalAllowed: false };
  assert.equal(sapToR22('0.5', m), '1.000000');
  assert.throws(() => sapToR22('0.1', m));
  assert.equal(
    sapToR22('0.2', { ...m, unit: 'KG', sapUnit: 'KG', packSize: null, decimalAllowed: true }),
    '0.200000',
  );
  assert.throws(() => sapToR22('1', { ...m, packSize: null }));
  assert.throws(() => sapToR22('0.000001', { ...m, packSize: '0.000001', decimalAllowed: true }));
  assert.throws(() => sapToR22('999999999999', m));
  assert.throws(() => validateStockQuantity('1.1', false));
  assert.equal(validateStockQuantity('2.000', false), '2.000000');
  assert.equal(validateCountQuantity('0', false), '0.000000');
  assert.equal(validateCountQuantity('10.000', false), '10.000000');
  assert.equal(validateCountQuantity('0.25', true), '0.250000');
  assert.throws(() => validateCountQuantity('10.5', false), /jumlah bulat/);
  assert.throws(() => validateCountQuantity('-1', true));
  assert.equal(allowsDecimals(' ea '), false);
  assert.equal(allowsDecimals('KG'), true);
  assert.equal(
    canonicalDocumentPayload({
      type: 'consume',
      hec: '452-BU1',
      lines: [{ quantity: '1.000000', materialId: 'a' }],
    }),
    canonicalDocumentPayload({
      lines: [{ materialId: 'a', quantity: '1.000000' }],
      hec: '452-BU1',
      type: 'consume',
    }),
  );
});
test('catalog mapping preserves master and excludes historical quantity/value', () => {
  const row = [
    '001234567890',
    'Material sintetis',
    'Nama umum',
    'KG',
    '',
    1,
    '2020-01-01',
    -50,
    12345,
    'Kimia',
  ];
  const parsed = parseCatalog(JSON.stringify({ batch: 'fixture', rows: [row] }));
  assert.equal(parsed.rows[0].mmid, '001234567890');
  assert.equal(parsed.rows[0].critical, true);
  assert.equal('quantity' in parsed.rows[0], false);
  assert.equal('oldStock' in parsed.rows[0], false);
  assert.equal('packSize' in parsed.rows[0], false);
  assert.throws(() => parseCatalog(JSON.stringify({ batch: 'fixture', rows: [row, row] })));
  assert.throws(() =>
    parseCatalog(JSON.stringify({ batch: 'fixture', rows: [[...row.slice(0, 3), '', ...row.slice(4)]] })),
  );
});

test('R22 Umum R22 shared pool helpers distinguish shared stock from specific work areas', () => {
  assert.equal(R22_SHARED_AREA, 'Umum R22');
  assert.equal(R22_WORK_AREAS.includes(R22_SHARED_AREA), true);
  assert.equal(isSharedWorkArea(''), true);
  assert.equal(isSharedWorkArea('   '), true);
  assert.equal(isSharedWorkArea(null), true);
  assert.equal(isSharedWorkArea(undefined), true);
  assert.equal(isSharedWorkArea('Umum R22'), true);
  assert.equal(isSharedWorkArea(' Umum R22 '), true);
  assert.equal(isSharedWorkArea('RMP'), false);
  assert.equal(isSharedWorkArea('RMK 1'), false);
  assert.equal(isSharedWorkArea('Rack A-01'), false);
  assert.equal(workAreaLabel(''), 'Umum R22');
  assert.equal(workAreaLabel(null), 'Umum R22');
  assert.equal(workAreaLabel('Umum R22'), 'Umum R22');
  assert.equal(workAreaLabel('RMP'), 'RMP');
  assert.equal(workAreaLabel('Rack A-01'), 'Rack A-01');
});

test('R22 Cost Center master list contains 43 unique codes and formats labels cleanly', () => {
  assert.equal(R22_COST_CENTERS.length, 43);
  const codes = R22_COST_CENTERS.map((c) => c.code);
  assert.equal(new Set(codes).size, 43);
  for (const cc of R22_COST_CENTERS) {
    assert.ok(cc.code.length >= 1 && cc.code.length <= 40);
    assert.ok(cc.description.length > 0);
  }
  assert.equal(costCenterLabel('40420'), '40420 — TQ2-Clinker Production');
  assert.equal(costCenterLabel(' 10410 '), '10410 — TQ-RME Limestone');
  assert.equal(costCenterLabel('10451'), '10451 — TQ-Dolomite for Sale');
  assert.equal(costCenterLabel('LEGACY-CC'), 'LEGACY-CC');
  assert.equal(costCenterLabel(''), '');
  assert.equal(costCenterLabel(null), '');
});
