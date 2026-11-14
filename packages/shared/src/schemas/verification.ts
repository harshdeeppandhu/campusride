import { z } from 'zod';
import { VerificationKind, VerificationStatus } from '../enums.js';

export const VerificationKindSchema = z.enum([
  VerificationKind.COLLEGE_ID,
  VerificationKind.GOVT_ID,
  VerificationKind.SELFIE,
  VerificationKind.DRIVING_LICENCE,
  VerificationKind.VEHICLE_RC,
  VerificationKind.INSURANCE,
]);

export const AllowedUploadMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const UploadMimeTypeSchema = z.enum(AllowedUploadMimeTypes);

export const UploadUrlRequestSchema = z.object({
  kind: VerificationKindSchema,
  contentType: UploadMimeTypeSchema,
});
export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;

export const UploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string().min(1),
  expiresInSeconds: z.number().int(),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;

export const CreateVerificationRequestSchema = z.object({
  kind: VerificationKindSchema,
  docKey: z.string().min(1).max(255),
  docLast4: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, 'Last 4 must be exactly 4 digits')
    .optional(),
  vehicleId: z.string().uuid().optional(),
  expiresOn: z.string().datetime().optional(),
});
export type CreateVerificationRequest = z.infer<typeof CreateVerificationRequestSchema>;

export const VerificationRequestResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: VerificationKindSchema,
  vehicleId: z.string().uuid().nullable(),
  docKey: z.string().nullable(),
  status: z.enum([
    VerificationStatus.PENDING,
    VerificationStatus.APPROVED,
    VerificationStatus.REJECTED,
    VerificationStatus.EXPIRED,
  ]),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  rejectReason: z.string().nullable(),
  expiresOn: z.string().datetime().nullable(),
  purgeAfter: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type VerificationRequestResponse = z.infer<typeof VerificationRequestResponseSchema>;

export const AdminVerificationDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rejectReason: z.string().min(2).max(500).optional(),
});
export type AdminVerificationDecision = z.infer<typeof AdminVerificationDecisionSchema>;

export const AdminSetGenderVerifiedSchema = z.object({
  verified: z.boolean(),
});
export type AdminSetGenderVerified = z.infer<typeof AdminSetGenderVerifiedSchema>;
