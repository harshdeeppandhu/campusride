import { logger } from '../../lib/logger.js';
import type { EmailProvider, SendOtpEmailParams, SendEmailParams, SendEmailResult } from './interface.js';

export class ConsoleEmailAdapter implements EmailProvider {
  public readonly name = 'console';
  // In-memory store for testing and local dev introspection
  private lastOtps = new Map<string, string>();
  private sentMessages: Array<{ to: string; subject: string; text: string; at: Date }> = [];

  sendOtp(params: SendOtpEmailParams): Promise<SendEmailResult> {
    const messageId = `console-otp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.lastOtps.set(params.to.toLowerCase(), params.otp);

    logger.info(
      {
        recipient: params.to,
        otp: params.otp,
        expiryMinutes: params.expiryMinutes,
        messageId,
      },
      `[DEV EMAIL] OTP for ${params.to}: ${params.otp} (expires in ${params.expiryMinutes}m)`,
    );

    return Promise.resolve({ messageId });
  }

  send(params: SendEmailParams): Promise<SendEmailResult> {
    const messageId = `console-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sentMessages.push({
      to: params.to,
      subject: params.subject,
      text: params.text,
      at: new Date(),
    });

    logger.info(
      {
        recipient: params.to,
        subject: params.subject,
        messageId,
      },
      `[DEV EMAIL] To: ${params.to} | Subject: ${params.subject}`,
    );

    return Promise.resolve({ messageId });
  }

  /**
   * Helper for tests to inspect the latest OTP sent to an address.
   */
  getLastOtp(email: string): string | undefined {
    return this.lastOtps.get(email.toLowerCase());
  }

  /**
   * Helper for tests to reset in-memory state.
   */
  clear(): void {
    this.lastOtps.clear();
    this.sentMessages = [];
  }
}

export const consoleEmailAdapter = new ConsoleEmailAdapter();
