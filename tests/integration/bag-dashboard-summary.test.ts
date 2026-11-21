import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import {
  createReplacement,
  cancelReplacement,
  dashboard,
  snapshot,
  getBagDb,
  closeBagDb,
  bagSchema,
} from '@plant/bag-core';
import {
  displayCompartment,
  equipmentCodes,
  equipmentPositions,
  getEquipment,
  pickPriority,
  positionKey,
  type Identity,
  type Position,
} from '@plant/contracts';

if (
  process.env.TEST_DATABASE !== '1' ||
  !['localhost', '127.0.0.1', 'mysql'].includes(new URL(process.env.BAG_DATABASE_URL!).hostname)
)
  throw Error('Dashboard summary tests require an isolated local database.');
const actor: Identity = {
  id: randomUUID(),
  name: 'Dashboard summary fixture',
  email: 'dashboard-summary@example.test',
  position: 'Test',
  portalAdmin: false,
  mustChangePassword: false,
  grants: [{ appId: 'bag-filter', role: 'admin', equipment: [...equipmentCodes] }],
};
after(async () => {
  try {
    const rows = await getBagDb()
      .select({ id: bagSchema.batches.id })
      .from(bagSchema.batches)
      .where(eq(bagSchema.batches.actorId, actor.id));
    if (rows.length)
      await getBagDb().transaction(async (tx) => {
        const ids = rows.map((r) => r.id);
        await tx
          .delete(bagSchema.batchCancellations)
          .where(inArray(bagSchema.batchCancellations.batchId, ids));
        await tx.delete(bagSchema.bagAudit).where(inArray(bagSchema.bagAudit.batchId, ids));
        await tx.delete(bagSchema.installations).where(inArray(bagSchema.installations.batchId, ids));
        await tx.delete(bagSchema.batches).where(inArray(bagSchema.batches.id, ids));
      });
  } finally {
    await closeBagDb();
  }
});

test('dashboard adds per-unit ages, critical compartments, WO compliance and priority', async () => {
  const code = '422-BF1',
    eq422 = getEquipment(code)!;
  const now = Date.now(),
    year = new Date(now + 7 * 3600000).getUTCFullYear(),
    day = 86400000;
  const occupied = new Set((await snapshot(code, now)).positions.map(positionKey));
  const free = equipmentPositions(eq422).filter((p) => !occupied.has(positionKey(p)));
  // Prefer an empty compartment so its counts are exact for this fixture.
  const byCompartment = new Map<string, Position[]>();
  for (const p of free) {
    const k = `${p.side}|${p.compartment}`;
    byCompartment.set(k, [...(byCompartment.get(k) ?? []), p]);
  }
  const target = [...byCompartment.values()].find((list) => list.length === eq422.bagsPerCompartment);
  assert.ok(target, 'Test database needs one empty 422-BF1 compartment.');
  const [c1, c2, c3, w1, w2, fresh1, fresh2, fresh3, cancelled] = target;
  const others = free.filter((p) => !target.includes(p));
  const baseline = await dashboard([code], year, now);
  const create = (positions: Position[], ageMs: number, wo: string) =>
    createReplacement(
      actor,
      {
        equipmentCode: code,
        positions,
        installedAt: new Date(now - ageMs).toISOString(),
        brand: 'Filtras',
        reason: 'Dashboard summary fixture',
        wo,
      },
      randomUUID(),
    );
  await create([c1, c2, c3], 1300 * day, 'WO-OLD');
  await create([w1, w2], 1100 * day, '');
  await create([fresh1, fresh2], 60000, 'WO-INT-1');
  await create([fresh3], 60000, ' - ');
  const wrong = await create([cancelled, others[0]], 60000, '');
  await cancelReplacement(actor, code, wrong.batchId, { reason: 'Fixture salah' }, randomUUID());

  const result = await dashboard([code], year, now);
  const unit = result.perEquipment[0];
  assert.equal(
    unit.distribution.reduce((s, n) => s + n, 0),
    unit.installed,
  );
  assert.deepEqual(
    unit.distribution.map((value, index) => value - baseline.perEquipment[0].distribution[index]),
    [3, 0, 0, 0, 0, 2, 3],
  );

  // WO tanpa huruf/angka (" - ") dihitung tanpa WO; batch dibatalkan tidak dihitung.
  assert.deepEqual(
    {
      bags: result.woCompliance.bags - baseline.woCompliance.bags,
      bagsWithWo: result.woCompliance.bagsWithWo - baseline.woCompliance.bagsWithWo,
      batches: result.woCompliance.batches - baseline.woCompliance.batches,
      batchesWithoutWo: result.woCompliance.batchesWithoutWo - baseline.woCompliance.batchesWithoutWo,
    },
    { bags: 3, bagsWithWo: 2, batches: 2, batchesWithoutWo: 1 },
  );
  const previousYear = await dashboard([code], year - 1, now);
  assert.ok(previousYear.woCompliance.bags <= previousYear.periodTotal);

  assert.ok(result.compartments.length <= 3);
  for (const [i, c] of result.compartments.entries()) {
    assert.ok(c.older1260 > 0 || c.warning > 0);
    assert.equal(c.label, displayCompartment(c, eq422));
    assert.ok(Number.isFinite(Date.parse(c.oldestInstalledAt)));
    const next = result.compartments[i + 1];
    if (next)
      assert.ok(
        c.older1260 > next.older1260 || (c.older1260 === next.older1260 && c.warning >= next.warning),
      );
  }
  const fixture = result.compartments.find((c) => c.side === c1.side && c.compartment === c1.compartment);
  const last = result.compartments.at(-1);
  if (fixture) {
    assert.deepEqual([fixture.installed, fixture.older1260, fixture.warning], [8, 3, 2]);
    // Bag tertua yang masih terpasang adalah batch 1.300 hari.
    assert.ok(Math.abs(Date.parse(fixture.oldestInstalledAt) - (now - 1300 * day)) < 1000);
  } else
    assert.ok(
      result.compartments.length === 3 &&
        last &&
        (last.older1260 > 3 || (last.older1260 === 3 && last.warning >= 2)),
    );

  assert.deepEqual(
    result.priority,
    pickPriority(
      result.perEquipment.map((e) => ({
        code: e.code,
        installed: e.installed,
        older1260: e.older1260,
        warning: e.distribution[5],
      })),
    ),
  );
  assert.equal(result.priority.level, 'critical');
  assert.equal(result.priority.code, code);
  assert.deepEqual((await dashboard([], year, now)).priority, {
    level: 'healthy',
    code: null,
    count: 0,
    installed: 0,
  });
});
