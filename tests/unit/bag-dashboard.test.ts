import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bagWarningDays,
  compareBagLoad,
  formatDateWib,
  formatPercent,
  hasWorkOrder,
  pickPriority,
  type BagAgeLoad,
} from '@plant/contracts';

test('formatPercent uses the id-ID decimal comma', () => {
  assert.equal(formatPercent(94), '94,0%');
  assert.equal(formatPercent(76.84), '76,8%');
  assert.equal(formatPercent(30.04), '30,0%');
  assert.equal(formatPercent(0), '0,0%');
  assert.equal(formatPercent(100), '100,0%');
  assert.equal(formatPercent(12.345, 2), '12,35%');
  assert.equal(formatPercent(7, 0), '7%');
  assert.equal(formatPercent(Number.NaN), '0,0%');
});

test('bagWarningDays marks the interval before the age scale limit', () => {
  assert.equal(bagWarningDays, 1050);
});

const unit = (code: BagAgeLoad['code'], installed: number, older1260: number, warning: number) => ({
  code,
  installed,
  older1260,
  warning,
});

test('pickPriority prefers the highest critical share over the largest count', () => {
  assert.deepEqual(
    pickPriority([
      unit('561-BF1', 2600, 300, 50),
      unit('421-BF1', 4080, 1197, 9),
      unit('L62-BF1', 1629, 900, 135),
    ]),
    { level: 'critical', code: 'L62-BF1', count: 900, installed: 1629 },
  );
});

test('compareBagLoad orders the list so its first unit is the priority', () => {
  const units = [
    unit('561-BF1', 2600, 1171, 11),
    unit('562-BF1', 3213, 1008, 0),
    unit('421-BF1', 4080, 1197, 9),
    unit('422-BF1', 4080, 0, 131),
    unit('L61-BF1', 2048, 369, 15),
    unit('L62-BF1', 0, 0, 0),
  ];
  const sorted = [...units].sort(compareBagLoad).map((u) => u.code);
  assert.deepEqual(sorted, ['561-BF1', '562-BF1', '421-BF1', 'L61-BF1', '422-BF1', 'L62-BF1']);
  assert.equal(pickPriority(units).code, sorted[0]);
});

test('pickPriority breaks share ties by count, then by catalog order', () => {
  assert.equal(pickPriority([unit('561-BF1', 2000, 200, 0), unit('L61-BF1', 1000, 100, 0)]).code, '561-BF1');
  assert.equal(pickPriority([unit('421-BF1', 1000, 100, 0), unit('422-BF1', 1000, 100, 0)]).code, '421-BF1');
});

test('pickPriority falls back to warning bags, then to a healthy state', () => {
  assert.deepEqual(pickPriority([unit('561-BF1', 2600, 0, 10), unit('562-BF1', 3000, 0, 40)]), {
    level: 'warning',
    code: '562-BF1',
    count: 40,
    installed: 3000,
  });
  const healthy = { level: 'healthy', code: null, count: 0, installed: 0 };
  assert.deepEqual(pickPriority([unit('561-BF1', 2600, 0, 0)]), healthy);
  assert.deepEqual(pickPriority([]), healthy);
});

test('hasWorkOrder needs a letter or digit', () => {
  assert.equal(hasWorkOrder('WO-2026-0001'), true);
  assert.equal(hasWorkOrder('12345'), true);
  for (const value of ['', '   ', '-', ' — ', '--', '.', null, undefined])
    assert.equal(hasWorkOrder(value), false);
});

test('formatDateWib prints the WIB calendar day without time', () => {
  assert.equal(formatDateWib('2022-05-08T17:30:00Z'), '9 Mei 2022');
  assert.equal(formatDateWib('2022-05-08T16:59:00Z'), '8 Mei 2022');
});
