import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
// Explicitly provisions existing MySQL volumes; initdb scripts run only for empty volumes.
export async function provisionDrawings() {
  try {
    await provision();
  } catch {
    throw Error(
      'Provisioning Drawing Database gagal. Periksa URL, kredensial dan hak migrasi; detail koneksi tidak dicatat.',
    );
  }
}
async function provision() {
  const runtime = process.env.DRAWINGS_DATABASE_URL,
    migration = process.env.DRAWINGS_MIGRATION_DATABASE_URL;
  if (!runtime || !migration) throw Error('URL database Drawing Database diperlukan.');
  const r = new URL(runtime),
    m = new URL(migration),
    password = decodeURIComponent(r.password);
  if (
    r.pathname !== '/plant_drawings' ||
    m.pathname !== '/plant_drawings' ||
    r.username !== 'plant_drawings' ||
    r.hostname !== m.hostname ||
    (r.port || '3306') !== (m.port || '3306') ||
    !/^[A-Za-z0-9_-]{24,128}$/.test(password)
  )
    throw Error('Konfigurasi provisioning Drawing Database tidak valid.');
  const c = await mysql.createConnection({
    host: m.hostname,
    port: Number(m.port) || 3306,
    user: decodeURIComponent(m.username),
    password: decodeURIComponent(m.password),
    timezone: 'Z',
  });
  try {
    await c.query(
      'CREATE DATABASE IF NOT EXISTS plant_drawings CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
    );
    await c.query("CREATE USER IF NOT EXISTS 'plant_drawings'@'%' IDENTIFIED BY ?", [password]);
    // Runtime credential is DML only; DDL runs through the migrate job.
    await c.query("GRANT SELECT,INSERT,UPDATE,DELETE ON plant_drawings.* TO 'plant_drawings'@'%'");
  } finally {
    await c.end();
  }
  const probe = await mysql.createConnection({ uri: runtime, timezone: 'Z' });
  try {
    await probe.query('SELECT 1');
  } finally {
    await probe.end();
  }
}
/**
 * Data migration `drawings-v1` on plant_auth: activates the planned catalog entry, fills its
 * path, and grants role `admin` to the active bootstrap account once. Other users are managed
 * through Kelola akses. A later disable or revoke by an administrator is preserved.
 */
export async function migrateDrawingsCatalog(c: mysql.Connection) {
  await c.beginTransaction();
  try {
    const [done] = await c.query<mysql.RowDataPacket[]>(
      "SELECT id FROM data_migrations WHERE id='drawings-v1' FOR UPDATE",
    );
    if (!done.length) {
      await c.query(
        "INSERT INTO applications(id,name,status,path) VALUES ('drawings','Drawing Database','active','/drawings') ON DUPLICATE KEY UPDATE name=VALUES(name),path=VALUES(path),status=IF(status='planned','active',status)",
      );
      const [people] = await c.query<mysql.RowDataPacket[]>(
        "SELECT DISTINCT u.id,u.name FROM users u JOIN auth_audit a ON a.target_id=u.id AND a.action='bootstrap.created' WHERE u.active=1 AND u.portal_admin=1",
      );
      for (const u of people) {
        const [result] = await c.query<mysql.ResultSetHeader>(
          "INSERT IGNORE INTO app_grants(user_id,app_id,role,equipment,scope) VALUES (?,'drawings','admin','[]',NULL)",
          [u.id],
        );
        if (result.affectedRows)
          await c.query(
            'INSERT INTO auth_audit(id,actor_id,actor_name,action,target_id,details,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(3))',
            [randomUUID(), u.id, u.name, 'drawings.bootstrap_granted', u.id, '{}'],
          );
      }
      await c.query("INSERT INTO data_migrations(id,completed_at) VALUES ('drawings-v1',UTC_TIMESTAMP(3))");
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  }
}
