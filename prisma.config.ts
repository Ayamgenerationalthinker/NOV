import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

// Prisma CLI (migrations) needs a direct (or session-pooled) connection. Supabase / Neon / Vercel
// Postgres expose it separately from the pooled URL the app uses at runtime; accept the names
// those integrations create. For Supabase set DIRECT_URL to the "Session pooler" string (port 5432).
const cliDatabaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

// `prisma generate` needs no database; only fail for commands that connect (migrate, db ...).
const needsDatabase = process.argv.some((arg) => arg === 'migrate' || arg === 'db');

if (!cliDatabaseUrl && needsDatabase && (process.env.VERCEL || process.env.CI)) {
  throw new Error(
    'No database is connected. Add a DATABASE_URL environment variable (your Supabase connection string) ' +
      'in Vercel → Settings → Environment Variables, then redeploy.'
  );
}

export default defineConfig({
  datasource: {
    url: cliDatabaseUrl || 'postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public',
  },
});
