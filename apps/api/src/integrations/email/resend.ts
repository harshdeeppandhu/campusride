import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { EmailProvider, SendOtpEmailParams, SendEmailParams, SendEmailResult } from './interface.js';

export class ResendEmailAdapter implements EmailProvider {
  public readonly name = 'resend';
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(apiKey?: string, fromAddress?: string) {
    this.apiKey = apiKey || env.RESEND_API_KEY || '';
    this.fromAddress = fromAddress || env.EMAIL_FROM || 'noreply@campusride.example.com';
  }

  async sendOtp(params: SendOtpEmailParams): Promise<SendEmailResult> {
    return this.send({
      to: params.to,
      subject: `Your ${env.APP_NAME} Verification Code: ${params.otp}`,
      text: `Your one-time verification code is ${params.otp}. It expires in ${params.expiryMinutes} minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">${env.APP_NAME} Verification</h2>
          <p style="color: #475569; font-size: 15px;">Use the following one-time code to sign in to your account:</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7;">${params.otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">This code will expire in ${params.expiryMinutes} minutes. For security, never share this code with anyone.</p>
        </div>
      `,
    });
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.apiKey) {
      logger.error('Resend API key missing; cannot send email');
      throw new AppError(
        'UPSTREAM_UNAVAILABLE',
        503,
        'Email service is temporarily unavailable.',
      );
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, 'Resend API returned error');
        throw new AppError(
          'UPSTREAM_UNAVAILABLE',
          502,
          'Failed to send email via upstream provider.',
        );
      }

      const data = (await response.json()) as { id: string };
      return { messageId: data.id };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Error sending email via Resend');
      throw new AppError(
        'UPSTREAM_UNAVAILABLE',
        502,
        'Email delivery failed.',
      );
    }
  }
}
