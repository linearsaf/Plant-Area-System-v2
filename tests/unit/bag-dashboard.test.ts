import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bagWarningDays, formatPercent, pickPriority, type BagAgeLoad } from '@plant/contracts';

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

test('pickPriority prefers the unit with the most critical bags', () => {
  assert.deepEqual(
    pickPriority([
      unit('561-BF1', 2600, 300, 50),
      unit('562-BF1', 3213, 1200, 0),
      unit('L62-BF1', 1629, 900, 135),
    ]),
    { level: 'critical', code: '562-BF1', count: 1200, installed: 3213 },
  );
});

test('pickPriority breaks critical ties by share, then by catalog order', () => {
  assert.equal(
    pickPriority([unit('561-BF1', 3000, 100, 0), unit('L61-BF1', 1000, 100, 0)]).code,
    'L61-BF1',
  );
  assert.equal(
    pickPriority([unit('421-BF1', 1000, 100, 0), unit('422-BF1', 1000, 100, 0)]).code,
    '421-BF1',
  );
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
