import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
  redact: {
    // Never log these fields — PII / secrets
    paths: [
      'authorization',
      '*.authorization',
      'phone',
      '*.phone',
      'email',
      '*.email',
      'otp',
      '*.otp',
      'token',
      '*.token',
      'code',
      '*.code',
      'password',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
});
