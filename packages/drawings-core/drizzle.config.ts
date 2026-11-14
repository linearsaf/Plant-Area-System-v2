import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './packages/drawings-core/src/schema.ts',
  out: './packages/drawings-core/migrations',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DRAWINGS_MIGRATION_DATABASE_URL || '' },
});
