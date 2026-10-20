import { NextRequest, NextResponse } from 'next/server';
import { WebhookRejectedError, WebhookService } from '@/services/payment/webhook.service';

export const dynamic = 'force-dynamic';

/**
 * Paystack webhook. 200 tells Paystack the event is settled (including duplicates and events we
 * ignore); 401 rejects forged requests; 500 makes Paystack deliver the event again later.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const result = await WebhookService.processWebhook('PAYSTACK', request.headers, rawBody);
    return NextResponse.json({ received: true, isDuplicate: result.isDuplicate || false });
  } catch (error) {
    if (error instanceof WebhookRejectedError) {
      console.warn('Rejected Paystack webhook:', error.message);
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }
    console.error('Paystack webhook processing failed; Paystack will retry:', error);
    return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
  }
}
