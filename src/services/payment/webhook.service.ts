import { prisma } from '@/lib/prisma';
import { PaymentProviderType } from './payment.interface';
import { PaymentService } from './payment.service';
import { OrderService } from '@/services/order/order.service';
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
   * Cryptographically verify, record, and idempotently process payment webhooks
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

    // 3. Idempotency Check: check if eventId or transactionRef has already been successfully processed
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

    // Record the webhook event record
    const recordedEvent = await prisma.paymentWebhookEvent.create({
      data: {
        provider,
        eventType,
        eventId: eventId || null,
        payload: rawPayload as any,
        isProcessed: false,
      },
    });

    try {
      // 4. Find the corresponding transaction or order
      let orderId: string | undefined;
      const transaction = await prisma.transaction.findUnique({
        where: { transactionRef },
        include: { order: true },
      });

      if (transaction) {
        orderId = transaction.orderId;
      } else {
        // Fallback: check metadata in payload for orderId or orderNumber
        const metadata = rawPayload?.data?.metadata || rawPayload?.meta || {};
        if (metadata.orderId) {
          orderId = metadata.orderId;
        } else if (metadata.orderNumber) {
          const order = await prisma.order.findUnique({
            where: { orderNumber: metadata.orderNumber },
          });
          if (order) orderId = order.id;
        }
      }

      if (!orderId) {
        // Save note in event and return
        await prisma.paymentWebhookEvent.update({
          where: { id: recordedEvent.id },
          data: {
            error: `Unable to match transactionRef ${transactionRef} to any existing order.`,
            isProcessed: true,
            processedAt: new Date(),
          },
        });

        return {
          success: false,
          message: `No order found matching transactionRef ${transactionRef}`,
          transactionRef,
        };
      }

      // 5. Update Transaction status if exists
      if (transaction) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: isSuccessful ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
            rawPayload: rawPayload as any,
          },
        });
      }

      // 6. Transition Order Status if successful
      if (isSuccessful) {
        await OrderService.transitionOrderStatus({
          orderId,
          toStatus: OrderStatus.PAID,
          paymentProvider: provider,
          transactionRef,
          notes: `Fulfilled via ${provider} webhook (${eventType})`,
        });
      } else {
        // If explicitly failed event
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.FAILED },
        });
      }

      // 7. Mark webhook as processed
      await prisma.paymentWebhookEvent.update({
        where: { id: recordedEvent.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Successfully processed ${provider} webhook for order ${orderId}`,
        orderId,
        transactionRef,
      };
    } catch (err: any) {
      // Record failure on webhook event
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
