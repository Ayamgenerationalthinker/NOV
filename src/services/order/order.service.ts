import { prisma } from '@/lib/prisma';
import { OrderStatus, FulfillmentStatus, ProductKind, Prisma, Role } from '@prisma/client';
import { CouponService } from '../coupon/coupon.service';
import { EntitlementService } from '../entitlement/entitlement.service';
import { EmailService } from '../email/email.service';
import { ShippingService } from '../shipping/shipping.service';
import { InventoryService } from '../inventory/inventory.service';
import { PasswordService } from '../auth/password.service';
import crypto from 'crypto';

export interface CreateOrderItemInput {
  productId: string;
  variantId?: string;
  quantity?: number;
}

export interface ShippingAddressInput {
  fullName: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone: string;
}

export interface CreateOrderParams {
  customerId?: string;
  guestEmail?: string;
  guestName?: string;
  /** Buyer phone for Mobile Money / delivery contact (stored on billingAddress). */
  contactPhone?: string;
  items: CreateOrderItemInput[];
  couponCode?: string;
  currency?: string;
  shippingAddress?: ShippingAddressInput;
  shippingMethod?: string;
  customerNotes?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface TransitionOrderStatusParams {
  orderId: string;
  toStatus: OrderStatus;
  paymentProvider?: string;
  transactionRef?: string;
  adminUserId?: string;
  notes?: string;
  restockPhysicalItems?: boolean;
}

/** A problem the buyer can fix (bad option, not enough stock, missing address...). Returned as HTTP 400. */
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

/** How long stock is held for a buyer who is paying. */
const RESERVATION_MINUTES = 30;

export class OrderService {
  /**
   * Generate an audit-friendly, unique order identifier
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `NOV-${timestamp}-${random}`;
  }

  /**
   * Create an order with zero-trust server-side price, variant, stock, and shipping validation
   */
  static async createOrder({
    customerId,
    guestEmail,
    guestName,
    contactPhone,
    items,
    couponCode,
    currency,
    shippingAddress,
    shippingMethod,
    customerNotes,
    utmSource,
    utmMedium,
    utmCampaign,
  }: CreateOrderParams) {
    if (!items || items.length === 0) {
      throw new OrderValidationError('Your order is empty.');
    }

    if (!customerId && !guestEmail) {
      throw new OrderValidationError('Please enter your email address.');
    }

    // Free stock held by checkouts that were abandoned more than RESERVATION_MINUTES ago.
    try {
      await InventoryService.releaseExpiredReservations();
    } catch (err) {
      console.error('Failed to release expired reservations:', err);
    }

    const productIds = Array.from(new Set(items.map((i) => i.productId)));

    // Fetch live product records directly from database
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
      },
      include: {
        variants: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new OrderValidationError('This product is no longer available.');
    }

    const currencies = Array.from(new Set(products.map((p) => p.currency.toUpperCase())));
    if (currencies.length > 1) {
      throw new OrderValidationError('These products are priced in different currencies and must be bought separately.');
    }
    // Always charge in the products' own currency, whatever the client sent.
    const orderCurrency = currencies[0];
    if (currency && currency.toUpperCase() !== orderCurrency) {
      console.warn(`Ignoring requested currency ${currency}; products are priced in ${orderCurrency}.`);
    }

    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      variantId?: string;
      productKind: ProductKind;
      sku?: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      totalPrice: number;
      storeId?: string | null;
      label: string;
    }> = [];

    let hasPhysicalItems = false;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      const isPhysical = product.productKind === ProductKind.PHYSICAL;
      // Digital items are always quantity 1.
      const quantity = isPhysical ? Math.max(1, Math.floor(item.quantity || 1)) : 1;
      if (isPhysical) hasPhysicalItems = true;

      let unitPrice =
        product.discountPrice !== null && Number(product.discountPrice) < Number(product.price)
          ? Number(product.discountPrice)
          : Number(product.price);

      let sku: string | undefined = undefined;
      let variantId: string | undefined = undefined;
      let label = product.title;

      if (isPhysical) {
        const sellable = product.variants.filter((v) => v.isAvailable);
        let variant = item.variantId ? sellable.find((v) => v.id === item.variantId) : undefined;

        if (item.variantId && !variant) {
          throw new OrderValidationError(`The option you chose for "${product.title}" is no longer available.`);
        }
        if (!variant) {
          // Products without options have exactly one (hidden default) variant.
          if (sellable.length === 1) variant = sellable[0];
          else if (sellable.length === 0) throw new OrderValidationError(`"${product.title}" is sold out.`);
          else throw new OrderValidationError(`Please choose an option for "${product.title}".`);
        }

        const available = variant.inventoryQuantity - variant.reservedQuantity;
        if (available < quantity) {
          throw new OrderValidationError(
            available <= 0
              ? `"${product.title}" is sold out.`
              : `Only ${available} of "${product.title}" left. Please lower the quantity.`
          );
        }

        unitPrice =
          variant.salePrice !== null && Number(variant.salePrice) < Number(variant.price)
            ? Number(variant.salePrice)
            : Number(variant.price);
        sku = variant.sku;
        variantId = variant.id;
        if (variant.option1Value) label = `${product.title} (${variant.title})`;
      }

      const itemTotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: product.id,
        variantId,
        productKind: product.productKind,
        sku,
        quantity,
        unitPrice,
        discountAmount: 0,
        totalPrice: itemTotal,
        storeId: product.storeId,
        label,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    if (hasPhysicalItems && !shippingAddress) {
      throw new OrderValidationError('Please enter a delivery address.');
    }

    // Calculate shipping fee if order includes physical items
    let shippingFee = 0;
    if (hasPhysicalItems && shippingAddress?.country) {
      const shippingCalc = await ShippingService.calculateShippingFee({
        countryCode: shippingAddress.country,
        items: orderItemsData.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      shippingFee = shippingCalc.shippingFee;
    }

    // Validate and calculate coupon discount
    let discountTotal = 0;
    let validatedCouponId: string | undefined;

    if (couponCode && couponCode.trim()) {
      const couponResult = await CouponService.validateCoupon({
        code: couponCode,
        subtotal,
        customerId,
      });

      // Never silently charge full price when the buyer expected a discount.
      if (!couponResult.valid || !couponResult.coupon) {
        throw new OrderValidationError(couponResult.message || 'That discount code is not valid.');
      }
      discountTotal = couponResult.discountAmount;
      validatedCouponId = couponResult.coupon.id;
    }

    const total = Math.max(0, Math.round((subtotal - discountTotal + shippingFee) * 100) / 100);
    const orderNumber = this.generateOrderNumber();
    const primaryStoreId = orderItemsData.find((i) => i.storeId)?.storeId || null;
    const contact = {
      fullName: guestName || shippingAddress?.fullName || null,
      email: guestEmail || null,
      phone: contactPhone || shippingAddress?.phone || null,
    };

    // Execute atomic creation transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerId || null,
          storeId: primaryStoreId,
          guestEmail: guestEmail || null,
          guestName: guestName || null,
          status: OrderStatus.PENDING,
          fulfillmentStatus: hasPhysicalItems ? FulfillmentStatus.UNFULFILLED : FulfillmentStatus.FULFILLED,
          subtotal,
          discountTotal,
          shippingFee,
          taxTotal: 0,
          total,
          currency: orderCurrency,
          shippingMethod: shippingMethod || (hasPhysicalItems ? 'Standard Courier' : 'Instant Digital Delivery'),
          shippingAddress: shippingAddress ? (shippingAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          billingAddress: contact as Prisma.InputJsonValue,
          customerNotes: customerNotes || null,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              productKind: item.productKind,
              sku: item.sku || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              totalPrice: item.totalPrice,
              fulfillmentStatus: item.productKind === ProductKind.PHYSICAL ? FulfillmentStatus.UNFULFILLED : FulfillmentStatus.FULFILLED,
            })),
          },
        },
        include: {
          items: {
            include: { product: true, variant: true },
          },
        },
      });

      // Hold physical stock while the buyer pays. The conditional update makes the stock check and
      // the hold a single atomic step, so two buyers can never both get the last unit.
      for (const item of orderItemsData) {
        if (item.variantId && item.productKind === ProductKind.PHYSICAL) {
          const held = await tx.$executeRaw`
            UPDATE "ProductVariant"
            SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}
            WHERE "id" = ${item.variantId}
              AND "inventoryQuantity" - "reservedQuantity" >= ${item.quantity}`;

          if (held === 0) {
            throw new OrderValidationError(`Sorry, "${item.label}" just sold out.`);
          }

          await tx.inventoryReservation.create({
            data: {
              variantId: item.variantId,
              quantity: item.quantity,
              orderId: newOrder.id,
              expiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
            },
          });
        }
      }

      // If coupon was applied, record redemption
      if (validatedCouponId) {
        await tx.couponRedemption.create({
          data: {
            couponId: validatedCouponId,
            orderId: newOrder.id,
            customerId: customerId || null,
            discountAmount: discountTotal,
          },
        });

        await tx.coupon.update({
          where: { id: validatedCouponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: customerId || null,
          action: 'CREATE_ORDER',
          entityType: 'Order',
          entityId: newOrder.id,
          newValue: {
            orderNumber,
            total,
            hasPhysicalItems,
            itemCount: items.length,
            couponCode: couponCode || null,
          },
        },
      });

      return newOrder;
    });

    return order;
  }

  /**
   * Order State Machine: transitions status, handles stock commitments, fulfillment, and digital entitlements
   */
  static async transitionOrderStatus({
    orderId,
    toStatus,
    paymentProvider,
    transactionRef,
    adminUserId,
    notes,
    restockPhysicalItems = true,
  }: TransitionOrderStatusParams) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, variant: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === toStatus) {
      return order;
    }

    const invalidTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PAID]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.REFUNDED]: [OrderStatus.PENDING, OrderStatus.PAID],
      [OrderStatus.CANCELLED]: [OrderStatus.PAID],
      // FAILED -> PAID is allowed: the customer can retry after a declined attempt.
      [OrderStatus.FAILED]: [],
      [OrderStatus.PENDING]: [],
      [OrderStatus.REFUND_PENDING]: [OrderStatus.PENDING],
      [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.PENDING],
      [OrderStatus.CHARGEBACK]: [OrderStatus.PENDING],
    };

    if (invalidTransitions[order.status]?.includes(toStatus)) {
      throw new Error(`Invalid order status transition from ${order.status} to ${toStatus}.`);
    }

    const isTransitioningToPaid = toStatus === OrderStatus.PAID;
    const isTransitioningToRefunded = toStatus === OrderStatus.REFUNDED;
    const isTransitioningToCancelled = toStatus === OrderStatus.CANCELLED;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Compare-and-set on the status we read, so concurrent callers (e.g. redirect + webhook)
      // cannot both run the side effects below.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: toStatus,
          paymentProvider: paymentProvider || order.paymentProvider,
          paidAt: isTransitioningToPaid ? new Date() : order.paidAt,
          cancelledAt: isTransitioningToCancelled ? new Date() : order.cancelledAt,
        },
      });

      if (count === 0) {
        return null;
      }

      const updated = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true, variant: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || order.customerId || null,
          action: `ORDER_STATUS_${toStatus}`,
          entityType: 'Order',
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: toStatus, paymentProvider, transactionRef, notes },
        },
      });

      return updated;
    });

    if (!updatedOrder) {
      // Another request changed the status first. If it reached the same target, that request
      // owns the side effects; anything else is a genuine conflict.
      const current = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true, variant: true } } },
      });
      if (current?.status === toStatus) {
        return current;
      }
      throw new Error(`Order ${orderId} status changed concurrently (now ${current?.status}); transition to ${toStatus} aborted.`);
    }

    // Side effect upon payment:
    if (isTransitioningToPaid) {
      // 1. Take physical items out of stock: commit active holds; if a hold already lapsed
      //    (buyer paid after RESERVATION_MINUTES), deduct the stock directly.
      const reservations = await prisma.inventoryReservation.findMany({
        where: { orderId: order.id, isReleased: false },
      });

      const heldByVariant = new Map<string, number>();
      for (const res of reservations) {
        await InventoryService.commitReservation(res.id, order.id);
        heldByVariant.set(res.variantId, (heldByVariant.get(res.variantId) ?? 0) + res.quantity);
      }

      for (const item of order.items) {
        if (!item.variantId || item.product.productKind !== ProductKind.PHYSICAL) continue;
        const held = heldByVariant.get(item.variantId) ?? 0;
        const covered = Math.min(held, item.quantity);
        heldByVariant.set(item.variantId, held - covered);
        const missing = item.quantity - covered;
        if (missing > 0) {
          await InventoryService.adjustStock({
            variantId: item.variantId,
            quantityChange: -missing,
            movementType: 'ORDER_FULFILLMENT',
            referenceId: order.id,
            note: 'Paid after the stock hold expired',
          });
        }
      }

      // 2. Grant entitlements for digital items
      let recipientCustomerId = order.customerId;
      if (!recipientCustomerId && order.guestEmail) {
        const cleanEmail = order.guestEmail.toLowerCase().trim();
        let customerUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!customerUser) {
          const generatedSecret = crypto.randomBytes(24).toString('hex');
          const passwordHash = await PasswordService.hashPassword(generatedSecret);
          customerUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: order.guestName || cleanEmail.split('@')[0],
              passwordHash,
              role: Role.CUSTOMER,
            },
          });
        }

        recipientCustomerId = customerUser.id;
        await prisma.order.update({
          where: { id: order.id },
          data: { customerId: customerUser.id },
        });
      }

      if (recipientCustomerId) {
        for (const item of order.items) {
          if (item.product.productKind === ProductKind.DIGITAL) {
            await EntitlementService.grantEntitlement({
              customerId: recipientCustomerId,
              productId: item.productId,
              orderId: order.id,
            });
          }
        }
      }

      // 3. Dispatch receipt email
      EmailService.sendOrderReceiptEmail(order.id).catch((err) => {
        console.error(`Failed to dispatch receipt for ${order.id}:`, err);
      });
    }

    // Side effect upon cancellation: release reserved stock
    if (isTransitioningToCancelled) {
      const reservations = await prisma.inventoryReservation.findMany({
        where: { orderId: order.id, isReleased: false },
      });
      for (const res of reservations) {
        await InventoryService.releaseReservation(res.id);
      }
    }

    // Side effect upon refund:
    if (isTransitioningToRefunded) {
      // Revoke digital entitlements
      if (order.customerId) {
        const entitlements = await prisma.entitlement.findMany({
          where: { orderId: order.id, customerId: order.customerId },
        });
        for (const ent of entitlements) {
          await EntitlementService.revokeEntitlement({
            entitlementId: ent.id,
            reason: notes || 'Order refunded',
            adminUserId,
          });
        }
      }

      // Restock physical items if requested
      if (restockPhysicalItems) {
        for (const item of order.items) {
          if (item.variantId && item.product.productKind === ProductKind.PHYSICAL) {
            await InventoryService.adjustStock({
              variantId: item.variantId,
              quantityChange: item.quantity,
              movementType: 'RETURN_RESTOCK',
              referenceId: order.id,
              note: `Restocked after order refund`,
              performedBy: adminUserId,
            });
          }
        }
      }

      EmailService.sendRefundConfirmationEmail(order.id, notes).catch((err) => {
        console.error(`Failed to dispatch refund notice for ${order.id}:`, err);
      });
    }

    return updatedOrder;
  }

  /**
   * Get order by ID with full details
   */
  static async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                productType: true,
                productKind: true,
                model3dUrl: true,
                files: {
                  select: { id: true, fileName: true, fileSize: true, versionNumber: true },
                },
              },
            },
            variant: true,
            fulfillment: true,
          },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        transactions: true,
        fulfillments: true,
        returns: true,
      },
    });
  }

  /**
   * Get order by public order number
   */
  static async getOrderByNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                productType: true,
                productKind: true,
                model3dUrl: true,
                files: {
                  select: { id: true, fileName: true, fileSize: true, versionNumber: true },
                },
              },
            },
            variant: true,
            fulfillment: true,
          },
        },
        transactions: true,
        fulfillments: true,
      },
    });
  }

  /**
   * Get customer order history
   */
  static async getCustomerOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, coverImage: true, productKind: true },
            },
            variant: true,
          },
        },
        fulfillments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
