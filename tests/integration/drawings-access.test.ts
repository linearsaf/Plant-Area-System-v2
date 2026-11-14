import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { eq } from 'drizzle-orm';
import {
  appDirectory,
  createUser,
  setAppGrant,
  setGrant,
  updateUserAccess,
  getAuthDb,
  authSchema,
  closeAuthDb,
} from '@plant/auth-core';
import { AppError, drawingsRoles, type Identity } from '@plant/contracts';
import { migrateDrawingsCatalog } from '../../scripts/drawings-migration';
if (
  process.env.TEST_DATABASE !== '1' ||
  !process.env.AUTH_MIGRATION_DATABASE_URL?.includes('127.0.0.1:13306/plant_auth')
)
  throw Error('Isolated database required.');
const actor: Identity = {
  id: randomUUID(),
  name: 'Drawings access test',
  email: 'drawings-access@example.test',
  position: '',
  portalAdmin: true,
  mustChangePassword: false,
  grants: [],
};
const fixtureUser = (name: string) =>
  createUser(actor, { name, email: randomUUID() + '@example.test', password: 'temporary-drawing-password' });

test('drawings grants are role-only, reject scope fields and revoke independently', async () => {
  const { id } = await fixtureUser('Drawings fixture');
  await setGrant(actor, id, { appId: 'bag-filter', role: 'viewer', equipment: ['561-BF1'] });
  await setAppGrant(actor, id, 'consumables', { appId: 'consumables', role: 'viewer' });
  const read = () => getAuthDb().select().from(authSchema.grants).where(eq(authSchema.grants.userId, id));
  for (const role of drawingsRoles) {
    await setAppGrant(actor, id, 'drawings', { appId: 'drawings', role });
    const grant = (await read()).find((g) => g.appId === 'drawings')!;
    assert.equal(grant.role, role);
    assert.equal(grant.scope, null);
    assert.equal(grant.equipment, '[]');
  }
  for (const invalid of [
    { appId: 'drawings', role: 'operator' },
    { appId: 'drawings', role: 'admin', equipment: ['561-BF1'] },
    { appId: 'consumables', role: 'admin' },
    'admin',
  ])
    await assert.rejects(
      setAppGrant(actor, id, 'drawings', invalid),
      (e) => e instanceof AppError && e.status === 400,
    );
  assert.equal((await read()).find((g) => g.appId === 'drawings')!.role, 'admin');
  await setAppGrant(actor, id, 'drawings', null);
  assert.deepEqual((await read()).map((g) => g.appId).sort(), ['bag-filter', 'consumables']);
});

test('directory lists active drawings users with role filter and omits email', async () => {
  const leader = await fixtureUser('Directory leader'),
    approver = await fixtureUser('Directory approver'),
    inactive = await fixtureUser('Directory inactive'),
    consumer = await fixtureUser('Directory consumer only');
  await setAppGrant(actor, leader.id, 'drawings', { appId: 'drawings', role: 'leader' });
  await setAppGrant(actor, approver.id, 'drawings', { appId: 'drawings', role: 'approver' });
  await setAppGrant(actor, inactive.id, 'drawings', { appId: 'drawings', role: 'approver' });
  await setAppGrant(actor, consumer.id, 'consumables', { appId: 'consumables', role: 'viewer' });
  await updateUserAccess(actor, inactive.id, { active: false, portalAdmin: false });
  const all = await appDirectory('drawings');
  const ids = new Set(all.map((p) => p.id));
  assert.ok(ids.has(leader.id) && ids.has(approver.id));
  assert.ok(!ids.has(inactive.id) && !ids.has(consumer.id));
  for (const p of all) assert.deepEqual(Object.keys(p).sort(), ['id', 'name', 'position', 'role']);
  const approvers = await appDirectory('drawings', ['approver', 'admin']);
  assert.ok(approvers.some((p) => p.id === approver.id));
  assert.ok(approvers.every((p) => p.role === 'approver' || p.role === 'admin'));
  await assert.rejects(
    appDirectory('drawings', ['operator']),
    (e) => e instanceof AppError && e.status === 400,
  );
  await assert.rejects(appDirectory('consumables'), (e) => e instanceof AppError && e.status === 400);
});

test('drawings-v1 activates planned app, grants only active bootstrap once and preserves disable/revoke', async () => {
  const connection = await mysql.createConnection(process.env.AUTH_MIGRATION_DATABASE_URL!),
    name = 'drawings_fixture_' + randomUUID().replaceAll('-', '');
  if (!/^drawings_fixture_[a-f0-9]{32}$/.test(name)) throw Error('Invalid fixture name.');
  try {
    await connection.query(`CREATE DATABASE \`${name}\``);
    await connection.query(`USE \`${name}\``);
    await migrate(drizzle(connection), { migrationsFolder: 'packages/auth-core/migrations' });
    await connection.query(
      "INSERT INTO applications(id,name,status,path) VALUES ('bag-filter','Bag Filter','active','/bag-filter'),('consumables','Consumable Room','active','/consumables'),('drawings','Drawing Database','planned',NULL)",
    );
    const bootstrap = randomUUID(),
      other = randomUUID();
    for (const id of [bootstrap, other])
      await connection.query(
        'INSERT INTO users(id,name,email,email_verified,created_at,updated_at,position,active,portal_admin,must_change_password) VALUES (?,?,?,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),?,1,1,0)',
        [id, 'Fixture', id + '@example.test', ''],
      );
    await connection.query(
      'INSERT INTO auth_audit(id,actor_id,actor_name,action,target_id,details,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(3))',
      [randomUUID(), bootstrap, 'Fixture', 'bootstrap.created', bootstrap, '{}'],
    );
    await connection.query(
      "INSERT INTO app_grants(user_id,app_id,role,equipment) VALUES (?,'consumables','viewer','[]')",
      [other],
    );
    await migrateDrawingsCatalog(connection);
    const [granted] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT user_id,role FROM app_grants WHERE app_id='drawings'",
    );
    assert.equal(granted.length, 1);
    assert.equal(granted[0].user_id, bootstrap);
    assert.equal(granted[0].role, 'admin');
    const [active] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT status,path FROM applications WHERE id='drawings'",
    );
    assert.equal(active[0].status, 'active');
    assert.equal(active[0].path, '/drawings');
    await connection.query("DELETE FROM app_grants WHERE app_id='drawings'");
    await connection.query("UPDATE applications SET status='disabled' WHERE id='drawings'");
    await migrateDrawingsCatalog(connection);
    const [remaining] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT app_id FROM app_grants ORDER BY app_id',
    );
    assert.deepEqual(
      remaining.map((v) => v.app_id),
      ['consumables'],
    );
    const [apps] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT status FROM applications WHERE id='drawings'",
    );
    assert.equal(apps[0].status, 'disabled');
    const [events] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM auth_audit WHERE action='drawings.bootstrap_granted'",
    );
    assert.equal(Number(events[0].n), 1);
  } finally {
    await connection.query('USE plant_auth');
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await connection.end();
  }
});

after(async () => {
  await closeAuthDb();
});
