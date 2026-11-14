import { env } from '../../config/env.js';
import type { SmsProvider } from './interface.js';
import { consoleSmsAdapter } from './console.js';

let defaultSmsProvider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (defaultSmsProvider) {
    return defaultSmsProvider;
  }

  switch (env.SMS_ADAPTER) {
    case 'console':
    default:
      defaultSmsProvider = consoleSmsAdapter;
      break;
  }

  return defaultSmsProvider;
}

export { type SmsProvider, type SendOtpSmsParams, type SendSmsParams, type SendSmsResult } from './interface.js';
export { consoleSmsAdapter } from './console.js';
