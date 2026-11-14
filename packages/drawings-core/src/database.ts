import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
const development = process.env.NODE_ENV === 'development';
const cache = globalThis as typeof globalThis & { __plantDrawingsPool?: mysql.Pool };
let pool = development ? cache.__plantDrawingsPool : undefined;
let db: ReturnType<typeof create> | undefined;
function create(p: mysql.Pool) {
  return drizzle(p, { schema, mode: 'default' });
}
export function getDrawingsDb() {
  if (!db) {
    if (!process.env.DRAWINGS_DATABASE_URL) throw Error('DRAWINGS_DATABASE_URL diperlukan.');
    pool ??= mysql.createPool({
      uri: process.env.DRAWINGS_DATABASE_URL,
      timezone: 'Z',
      connectionLimit: 10,
      ...(development ? { maxIdle: 2, idleTimeout: 60_000 } : {}),
    });
    if (development) cache.__plantDrawingsPool = pool;
    db = create(pool);
  }
  return db;
}
export async function closeDrawingsDb() {
  await pool?.end();
  if (cache.__plantDrawingsPool === pool) delete cache.__plantDrawingsPool;
  pool = undefined;
  db = undefined;
}
