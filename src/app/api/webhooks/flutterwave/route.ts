import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/services/payment/webhook.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headers = request.headers;

    const result = await WebhookService.processWebhook('FLUTTERWAVE', headers, rawBody);

    return NextResponse.json({
      received: true,
      message: result.message,
      isDuplicate: result.isDuplicate || false,
    });
  } catch (error: any) {
    console.error('Flutterwave webhook processing failed:', error);
    const isSignatureError = error?.message?.includes('Invalid FLUTTERWAVE webhook signature');

    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed' },
      { status: isSignatureError ? 401 : 400 }
    );
  }
}
