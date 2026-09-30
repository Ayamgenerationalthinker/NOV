import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

// Prisma CLI (migrations, db push) needs a direct connection. Neon/Vercel Postgres expose it
// separately from the pooled DATABASE_URL the app uses at runtime.
const cliDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public';

export default defineConfig({
  datasource: {
    url: cliDatabaseUrl,
  },
});
