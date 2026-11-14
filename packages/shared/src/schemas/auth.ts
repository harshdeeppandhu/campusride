import { z } from 'zod';
import { MemberType, UserRole, UserStatus, Gender, TrustTier, ConsentKind } from '../enums.js';

// ─── OTP Schemas ─────────────────────────────────────────────────────────────

export const OtpRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpRequestResponseSchema = z.object({
  message: z.string(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;

export const OtpVerifySchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

// ─── Auth Tokens & Sessions ──────────────────────────────────────────────────

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(), // seconds
  tokenType: z.literal('Bearer'),
  refreshToken: z.string().optional(), // provided in body for mobile/API clients; web uses httpOnly cookie
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(), // optional in body if provided via cookie
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const SessionItemSchema = z.object({
  id: z.string().uuid(),
  userAgent: z.string().nullable(),
  ipHash: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isCurrent: z.boolean(),
});
export type SessionItem = z.infer<typeof SessionItemSchema>;

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionItemSchema),
});
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// ─── Consents ────────────────────────────────────────────────────────────────

export const ConsentKindSchema = z.enum([
  ConsentKind.TOS,
  ConsentKind.PRIVACY,
  ConsentKind.LOCATION,
  ConsentKind.SOS_CONTACT_NOTICE,
]);

export const ConsentItemInputSchema = z.object({
  kind: ConsentKindSchema,
  version: z.string().min(1).max(20),
  granted: z.boolean(),
});
export type ConsentItemInput = z.infer<typeof ConsentItemInputSchema>;

export const ConsentSubmissionSchema = z.object({
  consents: z.array(ConsentItemInputSchema).min(1),
  adultConfirmed: z.boolean().optional(),
});
export type ConsentSubmission = z.infer<typeof ConsentSubmissionSchema>;

export const ConsentItemResponseSchema = z.object({
  kind: ConsentKindSchema,
  version: z.string(),
  grantedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});
export type ConsentItemResponse = z.infer<typeof ConsentItemResponseSchema>;

export const ConsentListResponseSchema = z.object({
  consents: z.array(ConsentItemResponseSchema),
  adultConfirmedAt: z.string().datetime().nullable(),
});
export type ConsentListResponse = z.infer<typeof ConsentListResponseSchema>;

// ─── Me & Trust Profiles ─────────────────────────────────────────────────────

export const MeProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerifiedAt: z.string().datetime().nullable(),
  phoneE164: z.string().nullable(),
  phoneVerifiedAt: z.string().datetime().nullable(),
  fullName: z.string().nullable(),
  photoKey: z.string().nullable(),
  memberType: z.enum([MemberType.STUDENT, MemberType.STAFF, MemberType.COMMUNITY]),
  role: z.enum([UserRole.MEMBER, UserRole.ADMIN, UserRole.SAFETY_ADMIN, UserRole.ANALYST]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DELETED]),
  gender: z.enum([Gender.FEMALE, Gender.MALE, Gender.NON_BINARY, Gender.UNDISCLOSED]),
  genderVerifiedAt: z.string().datetime().nullable(),
  collegeVerifiedAt: z.string().datetime().nullable(),
  department: z.string().nullable(),
  academicYear: z.number().int().nullable(),
  adultConfirmedAt: z.string().datetime().nullable(),
  privacy: z.record(z.string(), z.unknown()),
  locale: z.string(),
  trustTier: z.union([
    z.literal(TrustTier.T0),
    z.literal(TrustTier.T1),
    z.literal(TrustTier.T2),
    z.literal(TrustTier.T3),
  ]),
  badges: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type MeProfileResponse = z.infer<typeof MeProfileResponseSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  gender: z.enum([Gender.FEMALE, Gender.MALE, Gender.NON_BINARY, Gender.UNDISCLOSED]).optional(),
  department: z.string().max(100).optional(),
  academicYear: z.number().int().min(1).max(6).optional(),
  locale: z.string().min(2).max(10).optional(),
});
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export const TrustStepSchema = z.object({
  tier: z.union([
    z.literal(TrustTier.T0),
    z.literal(TrustTier.T1),
    z.literal(TrustTier.T2),
    z.literal(TrustTier.T3),
  ]),
  step: z.string(),
  description: z.string(),
  completed: z.boolean(),
});
export type TrustStep = z.infer<typeof TrustStepSchema>;

export const TrustProfileResponseSchema = z.object({
  tier: z.union([
    z.literal(TrustTier.T0),
    z.literal(TrustTier.T1),
    z.literal(TrustTier.T2),
    z.literal(TrustTier.T3),
  ]),
  badges: z.array(z.string()),
  steps: z.array(TrustStepSchema),
});
export type TrustProfileResponse = z.infer<typeof TrustProfileResponseSchema>;
