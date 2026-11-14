import { z } from 'zod';
import { PhoneE164Schema } from './common.js';

export const PhoneOtpRequestSchema = z.object({
  phone: PhoneE164Schema,
});
export type PhoneOtpRequest = z.infer<typeof PhoneOtpRequestSchema>;

export const PhoneOtpVerifySchema = z.object({
  phone: PhoneE164Schema,
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type PhoneOtpVerify = z.infer<typeof PhoneOtpVerifySchema>;
