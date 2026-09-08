import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('NOV.com'),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default('support@nov.com'),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public'),

  AUTH_SECRET: z
    .string()
    .default('dev-auth-secret-for-local-testing-32-chars-long'),
  AUTH_URL: z.string().url().optional(),

  // Payment Providers
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_ENCRYPTION_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET_HASH: z.string().optional(),

  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

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

function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn('⚠️ Environment variable parse notice:', result.error.flatten().fieldErrors);
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nov_dev?schema=public',
      AUTH_SECRET: process.env.AUTH_SECRET || 'dev-auth-secret-for-local-testing-32-chars-long',
    });
  }
  return result.data;
}

export const env = getEnv();
