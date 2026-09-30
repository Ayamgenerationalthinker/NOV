import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

// Prisma CLI (migrations) needs a direct connection. Neon / Vercel Postgres expose it separately
// from the pooled URL the app uses at runtime; accept the names those integrations create.
const cliDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

// `prisma generate` needs no database; only fail for commands that connect (migrate, db ...).
const needsDatabase = process.argv.some((arg) => arg === 'migrate' || arg === 'db');

if (!cliDatabaseUrl && needsDatabase && (process.env.VERCEL || process.env.CI)) {
  throw new Error(
    'No database is connected. In Vercel: Storage → Create Database → Neon (Postgres) → connect it to this project ' +
      '(or add a DATABASE_URL environment variable), then redeploy.'
  );
}

export default defineConfig({
  datasource: {
    url: cliDatabaseUrl || 'postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public',
  },
});
