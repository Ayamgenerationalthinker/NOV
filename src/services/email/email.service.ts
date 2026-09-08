import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Base method: sends transactional email via Resend API or dev mock
   */
  static async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 're_dev_placeholder_key') {
      console.log(`\n📧 [EMAIL SERVICE - DEV MOCK]`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content:\n${options.text || options.html}\n`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: errData.message || 'Failed to send email' };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Send Order Receipt & Digital Access Email
   */
  static async sendOrderReceiptEmail(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                title: true,
                slug: true,
                productType: true,
              },
            },
          },
        },
        transactions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      console.error(`Order ${orderId} not found for receipt dispatch.`);
      return false;
    }

    const recipientEmail = order.customer?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error(`No recipient email associated with order ${orderId}.`);
      return false;
    }

    const customerName = order.customer?.name || order.guestName || 'Valued Customer';
    const transaction = order.transactions[0];
    const totalAmount = Number(order.total).toFixed(2);
    const subtotalAmount = Number(order.subtotal).toFixed(2);
    const discountAmount = Number(order.discountTotal).toFixed(2);
    const libraryUrl = `${env.NEXT_PUBLIC_APP_URL}/account`;

    const itemsRowsHtml = order.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 12px 0; color: #f8fafc; font-weight: 600;">
            ${item.product.title}
            <div style="font-size: 11px; color: #94a3b8; font-weight: normal;">${item.product.productType}</div>
          </td>
          <td style="padding: 12px 0; text-align: right; color: #f8fafc; font-weight: bold;">
            $${Number(item.totalPrice).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your NOV.com Order Receipt</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            
            <!-- Header -->
            <div style="padding: 32px 32px 24px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #3b82f6;">NOV.com</div>
              <h1 style="margin: 16px 0 4px; font-size: 24px; font-weight: 800; color: #ffffff;">Thank you for your purchase!</h1>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Order #${order.orderNumber} • ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hi <strong>${customerName}</strong>,<br>
                Your order has been confirmed and lifetime digital entitlements have been unlocked on your account.
              </p>

              <!-- CTA Button -->
              <div style="margin: 28px 0; text-align: center;">
                <a href="${libraryUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);">
                  Access Digital Library & Downloads →
                </a>
              </div>

              <!-- Order Summary Table -->
              <div style="margin-top: 32px; padding: 20px; background-color: #0f172a; border-radius: 12px; border: 1px solid #334155;">
                <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tbody>
                    ${itemsRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style="padding: 10px 0 4px; color: #94a3b8;">Subtotal</td>
                      <td style="padding: 10px 0 4px; text-align: right; color: #cbd5e1;">$${subtotalAmount}</td>
                    </tr>
                    ${
                      Number(discountAmount) > 0
                        ? `
                      <tr>
                        <td style="padding: 4px 0; color: #10b981;">Coupon Discount</td>
                        <td style="padding: 4px 0; text-align: right; color: #10b981;">-$${discountAmount}</td>
                      </tr>
                    `
                        : ''
                    }
                    <tr>
                      <td style="padding: 12px 0 0; font-size: 16px; font-weight: 800; color: #ffffff; border-top: 1px solid #334155;">Total</td>
                      <td style="padding: 12px 0 0; text-align: right; font-size: 16px; font-weight: 800; color: #3b82f6; border-top: 1px solid #334155;">$${totalAmount} ${order.currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Payment Details -->
              <div style="margin-top: 20px; padding: 16px; background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; font-size: 12px; color: #94a3b8;">
                <div><strong>Payment Provider:</strong> ${order.paymentProvider || 'Online Payment'}</div>
                ${transaction?.transactionRef ? `<div><strong>Transaction Reference:</strong> ${transaction.transactionRef}</div>` : ''}
                <div><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">PAID</span></div>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 8px;">Need help with your download? Contact our creator team at <a href="mailto:support@nov.com" style="color: #3b82f6; text-decoration: none;">support@nov.com</a>.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} NOV.com. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: recipientEmail,
      subject: `Your receipt for Order #${order.orderNumber} - NOV.com`,
      html,
      text: `Thank you for your order #${order.orderNumber} ($${totalAmount} ${order.currency}). Access your digital products at: ${libraryUrl}`,
    });

    return result.success;
  }

  /**
   * Send Refund Confirmation Email
   */
  static async sendRefundConfirmationEmail(orderId: string, reason?: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return false;

    const recipientEmail = order.customer?.email || order.guestEmail;
    if (!recipientEmail) return false;

    const customerName = order.customer?.name || order.guestName || 'Customer';
    const refundedTotal = Number(order.total).toFixed(2);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #6366f1; margin-top: 0;">Refund Confirmation for Order #${order.orderNumber}</h2>
        <p>Hi ${customerName},</p>
        <p>A full refund of <strong>$${refundedTotal} ${order.currency}</strong> has been processed for your order #${order.orderNumber}.</p>
        ${reason ? `<p style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #6366f1; font-size: 13px;"><strong>Reason:</strong> ${reason}</p>` : ''}
        <p style="font-size: 13px; color: #64748b;">
          Please note that associated digital entitlements have been deactivated. The refunded funds will return to your original payment method within 3–7 business days depending on your bank or card issuer.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 11px;">If you have any questions, please contact support@nov.com.</p>
      </div>
    `;

    const result = await this.sendEmail({
      to: recipientEmail,
      subject: `Refund processed for Order #${order.orderNumber} - NOV.com`,
      html,
      text: `Your refund of $${refundedTotal} ${order.currency} for order #${order.orderNumber} has been processed.`,
    });

    return result.success;
  }

  /**
   * Broadcast Product Update Notification to all customers who own an active entitlement
   */
  static async sendProductUpdateEmail({
    productId,
    versionNumber,
    changelog,
  }: {
    productId: string;
    versionNumber: string;
    changelog?: string;
  }): Promise<{ dispatchedCount: number }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        entitlements: {
          where: { status: 'ACTIVE' },
          include: { customer: true },
        },
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found.`);
    }

    let dispatchedCount = 0;
    const downloadUrl = `${env.NEXT_PUBLIC_APP_URL}/account`;

    for (const entitlement of product.entitlements) {
      if (!entitlement.customer?.email) continue;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-top: 0;">New Version Available: ${product.title} v${versionNumber}</h2>
          <p>Great news! An update has been released for <strong>${product.title}</strong> which you own in your NOV.com digital library.</p>
          ${
            changelog
              ? `
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; color: #475569;">Changelog Notes:</h4>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155; white-space: pre-line;">${changelog}</p>
            </div>
          `
              : ''
          }
          <div style="margin: 24px 0;">
            <a href="${downloadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Download Update in Your Library →
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 11px;">You are receiving this update notice because you have lifetime personal access to this product.</p>
        </div>
      `;

      await this.sendEmail({
        to: entitlement.customer.email,
        subject: `Update Available: ${product.title} v${versionNumber} - NOV.com`,
        html,
        text: `A new version (v${versionNumber}) of ${product.title} is now available in your library at: ${downloadUrl}`,
      });

      dispatchedCount++;
    }

    return { dispatchedCount };
  }

  /**
   * Send Password Reset Email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2563eb; margin-top: 0;">Reset Your NOV.com Password</h2>
        <p>You requested a password reset for your account at NOV.com.</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
        <div style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: 'Reset your NOV.com password',
      html,
      text: `Reset your password at: ${resetUrl}`,
    });

    return result.success;
  }

  /**
   * Send Email Verification Link
   */
  static async sendVerificationEmail(email: string, verifyToken: string): Promise<boolean> {
    const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2563eb; margin-top: 0;">Welcome to NOV.com!</h2>
        <p>Please confirm your email address to secure your account and digital library.</p>
        <div style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Link expires in 24 hours.</p>
      </div>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: 'Verify your email on NOV.com',
      html,
      text: `Verify your email at: ${verifyUrl}`,
    });

    return result.success;
  }

  /**
   * Send Welcome & Discount Email to Newsletter Subscriber
   */
  static async sendNewsletterWelcomeEmail(toEmail: string, discountCode: string = 'WELCOME10'): Promise<boolean> {
    const storefrontUrl = env.NEXT_PUBLIC_APP_URL || 'https://nov.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2563eb; margin-top: 0;">Welcome to the NOV Creator & Developer Community!</h2>
        <p>Thanks for subscribing to our release notes, developer dispatches, and exclusive drops.</p>
        <p>As a warm welcome, here is an exclusive 10% discount on your first digital purchase:</p>
        <div style="margin: 20px 0; padding: 16px; background-color: #f1f5f9; border-radius: 8px; text-align: center;">
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">Your Coupon Code</span>
          <span style="font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2563eb;">${discountCode}</span>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${storefrontUrl}/products" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Explore Digital Goods →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 11px;">You can unsubscribe at any time. © ${new Date().getFullYear()} NOV.com</p>
      </div>
    `;

    const result = await this.sendEmail({
      to: toEmail,
      subject: `Welcome to NOV.com! Here is your 10% discount code (${discountCode})`,
      html,
      text: `Welcome to NOV.com! Use code ${discountCode} for 10% off your purchase at: ${storefrontUrl}`,
    });

    return result.success;
  }

  /**
   * Send Abandoned Cart Reminder Email
   */
  static async sendAbandonedCartEmail(params: {
    toEmail: string;
    customerName?: string;
    orderNumber: string;
    items: Array<{ title: string; price: number }>;
    totalAmount: number;
    currency: string;
    recoveryUrl: string;
    discountCode?: string;
  }): Promise<boolean> {
    const { toEmail, customerName, orderNumber, items, totalAmount, currency, recoveryUrl, discountCode } = params;

    const itemsHtml = items
      .map(
        (i) => `
        <li style="padding: 6px 0; color: #334155; font-size: 13px;">
          <strong>${i.title}</strong> — $${i.price.toFixed(2)}
        </li>
      `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2563eb; margin-top: 0;">Did you leave something behind?</h2>
        <p>Hi ${customerName || 'there'},</p>
        <p>We noticed you didn't finish completing your order #${orderNumber} for your digital goods.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #64748b;">Items in your checkout:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${itemsHtml}
          </ul>
          <p style="margin: 12px 0 0; font-weight: bold; font-size: 14px; color: #0f172a;">Total: $${totalAmount.toFixed(2)} ${currency}</p>
        </div>
        ${
          discountCode
            ? `
          <div style="background-color: #ecfdf5; border: 1px dashed #10b981; padding: 12px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #065f46;">
              Take an extra <strong>15% off</strong> to complete your order today with code:
              <strong style="font-family: monospace; font-size: 16px; color: #047857; display: block; margin-top: 4px;">${discountCode}</strong>
            </p>
          </div>
        `
            : ''
        }
        <div style="text-align: center; margin: 28px 0;">
          <a href="${recoveryUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Complete Your Checkout →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 11px;">Instant digital file access and lifetime license unlocks upon completion.</p>
      </div>
    `;

    const result = await this.sendEmail({
      to: toEmail,
      subject: `Complete your purchase for order #${orderNumber} - NOV.com`,
      html,
      text: `Complete your checkout for order #${orderNumber} at: ${recoveryUrl}`,
    });

    return result.success;
  }
}
