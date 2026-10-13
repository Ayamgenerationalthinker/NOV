import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { storageBackend } from '@/services/storage/storage.service';

export const dynamic = 'force-dynamic';

/** Setup check: open /api/health after a deploy to see what is connected. Never returns secrets. */
export async function GET() {
  let database = 'connected';
  let ownerAccount = 'unknown';
  try {
    const owners = await prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
    ownerAccount = owners > 0 ? 'created' : 'missing (set INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD and redeploy)';
  } catch (error) {
    console.error('Health check: database unreachable:', error);
    database = 'unreachable';
  }

  const healthy = database === 'connected' && storageBackend !== 'none';

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'needs_setup',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: env.NODE_ENV,
      appName: env.NEXT_PUBLIC_APP_NAME,
      services: {
        database,
        ownerAccount,
        storage: storageBackend === 'none' ? 'not_configured' : storageBackend,
        payments: {
          flutterwave: env.FLUTTERWAVE_SECRET_KEY ? 'configured' : 'pending_credentials',
          paystack: env.PAYSTACK_SECRET_KEY ? 'configured' : 'pending_credentials',
        },
        email: env.RESEND_API_KEY ? 'configured' : 'pending_credentials',
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
