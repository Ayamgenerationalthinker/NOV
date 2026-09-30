import { z } from 'zod';

const DEV_AUTH_SECRET = 'dev-auth-secret-for-local-testing-32-chars-long';
const DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('NOV.com'),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default('support@nov.com'),

  DATABASE_URL: z.string().default(DEV_DATABASE_URL),

  AUTH_SECRET: z.string().default(DEV_AUTH_SECRET),
  AUTH_URL: z.string().url().optional(),

  // Payment Providers
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_ENCRYPTION_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET_HASH: z.string().optional(),

  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),

  // Local-only simulated payments. Ignored when NODE_ENV=production.
  PAYMENT_SIMULATION: z.enum(['true', 'false']).optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('NOV.com <noreply@nov.com>'),

  // Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('nov-private-products'),
  R2_ENDPOINT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Production rules that must never fall back to development defaults.
 */
function assertProductionEnv(source: NodeJS.ProcessEnv): void {
  const problems: string[] = [];

  const authSecret = source.AUTH_SECRET;
  if (!authSecret || authSecret.length < 32 || authSecret === DEV_AUTH_SECRET) {
    problems.push('AUTH_SECRET must be set to a random string of at least 32 characters.');
  }
  if (!source.DATABASE_URL) {
    problems.push('DATABASE_URL must be set.');
  }
  if (!source.NEXT_PUBLIC_APP_URL) {
    problems.push('NEXT_PUBLIC_APP_URL must be set to the public site URL.');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production environment:\n- ${problems.join('\n- ')}`);
  }
}

export function loadEnv(rawSource: NodeJS.ProcessEnv = process.env): Env {
  // KEY="" in .env means "not set" (so defaults and "missing key" checks apply).
  const source = Object.fromEntries(
    Object.entries(rawSource).filter(([, value]) => value !== undefined && value.trim() !== '')
  ) as NodeJS.ProcessEnv;
  const isProduction = source.NODE_ENV === 'production';
  if (isProduction) {
    assertProductionEnv(source);
  }

  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }

  const fieldErrors = result.error.flatten().fieldErrors;
  if (isProduction) {
    throw new Error(`Invalid environment variables: ${JSON.stringify(fieldErrors)}`);
  }

  // Development: drop only the invalid keys (so they fall back to defaults) and keep everything else.
  console.warn('⚠️ Ignoring invalid environment variables:', fieldErrors);
  const cleaned: Record<string, string | undefined> = { ...source };
  for (const key of Object.keys(fieldErrors)) {
    delete cleaned[key];
  }
  return envSchema.parse(cleaned);
}

export const env = loadEnv();
