import { env } from '../../config/env.js';
import type { EmailProvider } from './interface.js';
import { consoleEmailAdapter } from './console.js';
import { ResendEmailAdapter } from './resend.js';

let defaultEmailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (defaultEmailProvider) {
    return defaultEmailProvider;
  }

  switch (env.EMAIL_ADAPTER) {
    case 'resend':
      defaultEmailProvider = new ResendEmailAdapter();
      break;
    case 'console':
    default:
      defaultEmailProvider = consoleEmailAdapter;
      break;
  }

  return defaultEmailProvider;
}

export { type EmailProvider, type SendOtpEmailParams, type SendEmailParams, type SendEmailResult } from './interface.js';
export { consoleEmailAdapter } from './console.js';
export { ResendEmailAdapter } from './resend.js';
