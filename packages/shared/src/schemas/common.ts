import { z } from 'zod';

// ─── Coordinate ─────────────────────────────────────────────────────────────

export const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinate = z.infer<typeof CoordinateSchema>;

// ─── Location Point (with optional label and placeId) ────────────────────────

export const LocationPointSchema = CoordinateSchema.extend({
  label: z.string().min(1).max(200),
  placeId: z.string().max(255).optional(),
});
export type LocationPoint = z.infer<typeof LocationPointSchema>;

// ─── Phone ───────────────────────────────────────────────────────────────────

/** E.164 format: +[country_code][number], 7-15 digits */
export const PhoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format');
export type PhoneE164 = z.infer<typeof PhoneE164Schema>;

// ─── OTP ─────────────────────────────────────────────────────────────────────

export const OtpRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

// ─── Pagination ──────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

// ─── Health ──────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  version: z.string(),
  checks: z.record(z.string(), z.object({
    status: z.enum(['ok', 'error']),
    message: z.string().optional(),
    durationMs: z.number().optional(),
  })),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── API Problem (RFC 7807) ───────────────────────────────────────────────────

export const ProblemSchema = z.object({
  type: z.string().url().optional(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  requestId: z.string(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
