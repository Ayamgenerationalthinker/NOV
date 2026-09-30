import { prisma } from '@/lib/prisma';
import { PaymentProviderType } from './payment.interface';
import { PaymentService } from './payment.service';
import { OrderStatus, TransactionStatus } from '@prisma/client';

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  orderId?: string;
  transactionRef?: string;
  isDuplicate?: boolean;
}

export class WebhookService {
  /**
   * Cryptographically verify, record, and idempotently process payment webhooks.
   *
   * A webhook is treated only as a signal: its payload is never trusted for the payment
   * outcome, amount, or order. Successful events are re-verified with the gateway through
   * PaymentService.confirmOrderPayment, exactly like the customer redirect.
   */
  static async processWebhook(
    provider: PaymentProviderType,
    headers: Headers,
    rawBody: string
  ): Promise<WebhookProcessResult> {
    const adapter = PaymentService.getAdapter(provider);

    // 1. Cryptographic signature check
    const isValidSignature = adapter.verifyWebhookSignature(headers, rawBody);
    if (!isValidSignature) {
      throw new Error(`Invalid ${provider} webhook signature`);
    }

    // 2. Parse payload
    const eventPayload = adapter.parseWebhookEvent(rawBody);
    if (!eventPayload) {
      throw new Error(`Failed to parse ${provider} webhook payload`);
    }

    const { eventType, eventId, transactionRef, isSuccessful, rawPayload } = eventPayload;

    // 3. Idempotency Check: skip events that were already processed
    if (eventId) {
      const existingEvent = await prisma.paymentWebhookEvent.findFirst({
        where: {
          provider,
          eventId,
          isProcessed: true,
        },
      });

      if (existingEvent) {
        return {
          success: true,
          message: `Event ${eventId} has already been processed (idempotent skip).`,
          transactionRef,
          isDuplicate: true,
        };
      }
    }

    // Record the webhook event
    const recordedEvent = await prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventType,
        eventId: eventId || null,
        payload: rawPayload as any,
        isProcessed: false,
      },
    });

    const finish = async (result: WebhookProcessResult, error?: string) => {
      await prisma.paymentWebhookEvent.update({
        where: { id: recordedEvent.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          error: error || null,
        },
      });
      return result;
    };

    try {
      // 4. Only references we issued are considered (no payload metadata fallback)
      const transaction = transactionRef
        ? await prisma.transaction.findUnique({
            where: { transactionRef },
            include: { order: true },
          })
        : null;

      if (!transaction) {
        const message = `No transaction found matching reference ${transactionRef || '(none)'}`;
        return finish({ success: false, message, transactionRef }, message);
      }

      if (transaction.provider !== provider) {
        const message = `Reference ${transactionRef} belongs to ${transaction.provider}, not ${provider}`;
        return finish({ success: false, message, transactionRef }, message);
      }

      // 5a. Successful event: re-verify with the gateway and apply all payment checks
      if (isSuccessful) {
        const confirmation = await PaymentService.confirmOrderPayment({
          reference: transactionRef,
          provider,
          source: 'webhook',
        });

        const paid = confirmation.outcome === 'PAID' || confirmation.outcome === 'ALREADY_PAID';
        return finish(
          {
            success: paid,
            message: `${provider} webhook for order ${transaction.orderId}: ${confirmation.outcome}${
              confirmation.reason ? ` (${confirmation.reason})` : ''
            }`,
            orderId: transaction.orderId,
            transactionRef,
          },
          paid ? undefined : `${confirmation.outcome}: ${confirmation.message}`
        );
      }

      // 5b. Failure event: record it, but never downgrade a paid order or a successful transaction
      if (transaction.status !== TransactionStatus.SUCCESSFUL) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.FAILED, rawPayload: rawPayload as any },
        });
      }
      await prisma.order.updateMany({
        where: { id: transaction.orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.FAILED },
      });

      return finish({
        success: true,
        message: `Recorded failed ${provider} payment for order ${transaction.orderId}`,
        orderId: transaction.orderId,
        transactionRef,
      });
    } catch (err: any) {
      // Leave isProcessed=false so the gateway's retry can process it again
      await prisma.paymentWebhookEvent.update({
        where: { id: recordedEvent.id },
        data: {
          error: err?.message || 'Unknown error processing webhook',
        },
      });
      throw err;
    }
  }
}
