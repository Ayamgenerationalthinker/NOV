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
    items,
    couponCode,
    currency = 'USD',
    shippingAddress,
    shippingMethod,
    customerNotes,
    utmSource,
    utmMedium,
    utmCampaign,
  }: CreateOrderParams) {
    if (!items || items.length === 0) {
      throw new Error('Cannot create an empty order. Cart has no items.');
    }

    if (!customerId && !guestEmail) {
      throw new Error('A customer account or guest email address is required to place an order.');
    }

    const productIds = items.map((i) => i.productId);

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
      throw new Error('One or more selected products are unavailable or unpublished.');
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
    }> = [];

    let hasPhysicalItems = false;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      const quantity = Math.max(1, item.quantity || 1);
      const isPhysical = product.productKind === ProductKind.PHYSICAL;
      if (isPhysical) hasPhysicalItems = true;

      let unitPrice =
        product.discountPrice !== null && Number(product.discountPrice) < Number(product.price)
          ? Number(product.discountPrice)
          : Number(product.price);

      let sku: string | undefined = undefined;
      let selectedVariantId = item.variantId;

      if (selectedVariantId) {
        const variant = product.variants.find((v) => v.id === selectedVariantId);
        if (variant) {
          unitPrice = variant.salePrice !== null ? Number(variant.salePrice) : Number(variant.price);
          sku = variant.sku;

          // Check physical stock availability
          if (isPhysical) {
            const availableStock = variant.inventoryQuantity - variant.reservedQuantity;
            if (availableStock < quantity) {
              throw new Error(`Insufficient stock for ${variant.title} (SKU: ${variant.sku}). Available: ${Math.max(0, availableStock)}`);
            }
          }
        }
      }

      const itemTotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: product.id,
        variantId: selectedVariantId || undefined,
        productKind: product.productKind,
        sku,
        quantity,
        unitPrice,
        discountAmount: 0,
        totalPrice: itemTotal,
        storeId: product.storeId,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

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

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon({
        code: couponCode,
        subtotal,
        customerId,
      });

      if (couponResult.valid && couponResult.coupon) {
        discountTotal = couponResult.discountAmount;
        validatedCouponId = couponResult.coupon.id;
      }
    }

    const total = Math.max(0, Math.round((subtotal - discountTotal + shippingFee) * 100) / 100);
    const orderNumber = this.generateOrderNumber();
    const primaryStoreId = orderItemsData.find((i) => i.storeId)?.storeId || null;

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
          currency,
          shippingMethod: shippingMethod || (hasPhysicalItems ? 'Standard Courier' : 'Instant Digital Delivery'),
          shippingAddress: shippingAddress ? (shippingAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
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

      // Reserve physical inventory stock
      for (const item of orderItemsData) {
        if (item.variantId && item.productKind === ProductKind.PHYSICAL) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { reservedQuantity: { increment: item.quantity } },
          });

          await tx.inventoryReservation.create({
            data: {
              variantId: item.variantId,
              quantity: item.quantity,
              orderId: newOrder.id,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes reservation window
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
      [OrderStatus.FAILED]: [OrderStatus.PAID],
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
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          paymentProvider: paymentProvider || order.paymentProvider,
          paidAt: isTransitioningToPaid ? new Date() : order.paidAt,
          cancelledAt: isTransitioningToCancelled ? new Date() : order.cancelledAt,
        },
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

    // Side effect upon payment:
    if (isTransitioningToPaid) {
      // 1. Commit inventory reservations for physical items
      const reservations = await prisma.inventoryReservation.findMany({
        where: { orderId: order.id, isReleased: false },
      });

      for (const res of reservations) {
        await InventoryService.commitReservation(res.id, order.id);
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
