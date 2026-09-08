import { env } from '@/lib/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send a transactional email (via Resend if configured, or console in development)
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
   * Send Password Reset Email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h2 style="color: #2563eb;">Reset Your NOV.com Password</h2>
        <p>You requested a password reset for your account at NOV.com.</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
        <div style="margin: 30px 0;">
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h2 style="color: #2563eb;">Welcome to NOV.com!</h2>
        <p>Please confirm your email address to secure your account and digital library.</p>
        <div style="margin: 30px 0;">
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
}
