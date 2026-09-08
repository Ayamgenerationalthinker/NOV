import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: env.NODE_ENV,
    appName: env.NEXT_PUBLIC_APP_NAME,
    services: {
      database: 'configured',
      payments: {
        flutterwave: env.FLUTTERWAVE_SECRET_KEY ? 'configured' : 'pending_credentials',
        paystack: env.PAYSTACK_SECRET_KEY ? 'configured' : 'pending_credentials',
      },
      email: env.RESEND_API_KEY ? 'configured' : 'pending_credentials',
      storage: env.R2_ACCESS_KEY_ID ? 'configured' : 'pending_credentials',
    },
  });
}
