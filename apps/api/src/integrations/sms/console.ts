import { logger } from '../../lib/logger.js';
import type { SmsProvider, SendOtpSmsParams, SendSmsParams, SendSmsResult } from './interface.js';

export class ConsoleSmsAdapter implements SmsProvider {
  public readonly name = 'console';
  private lastOtps = new Map<string, string>();
  private sentMessages: Array<{ phone: string; text: string; at: Date }> = [];

  sendOtp(params: SendOtpSmsParams): Promise<SendSmsResult> {
    const messageId = `console-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.lastOtps.set(params.phone, params.otp);

    logger.info(
      {
        phone: params.phone,
        otp: params.otp,
        expiryMinutes: params.expiryMinutes,
        messageId,
      },
      `[DEV SMS] OTP for ${params.phone}: ${params.otp} (expires in ${params.expiryMinutes}m)`,
    );

    return Promise.resolve({ messageId });
  }

  send(params: SendSmsParams): Promise<SendSmsResult> {
    const messageId = `console-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sentMessages.push({
      phone: params.phone,
      text: params.text,
      at: new Date(),
    });

    logger.info(
      {
        phone: params.phone,
        text: params.text,
        messageId,
      },
      `[DEV SMS] To: ${params.phone} | Text: ${params.text}`,
    );

    return Promise.resolve({ messageId });
  }

  getLastOtp(phone: string): string | undefined {
    return this.lastOtps.get(phone);
  }

  clear(): void {
    this.lastOtps.clear();
    this.sentMessages = [];
  }
}

export const consoleSmsAdapter = new ConsoleSmsAdapter();
