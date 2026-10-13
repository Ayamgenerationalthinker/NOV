import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';
import { pgConnectionString } from './pg-config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: pgConnectionString(env.DATABASE_URL),
      // Hosted databases (Supabase, Neon) can take a few seconds to answer a cold serverless function.
      connectionTimeoutMillis: 10_000,
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
