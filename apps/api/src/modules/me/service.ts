import { randomUUID } from 'node:crypto';
import { eq, and, isNull, desc, gt, ne } from 'drizzle-orm';
import type {
  ConsentSubmission,
  UpdateProfile,
  MeProfileResponse,
  TrustProfileResponse,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import { users, consents, authOtpChallenges, verificationRequests, vehicles } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { hashIp, generateOtp, hashOtp, verifyOtpHash } from '../auth/tokens.js';
import { getSmsProvider } from '../../integrations/sms/index.js';
import { getStorageProvider } from '../../integrations/storage/index.js';
import { auditService } from '../audit/service.js';
import { computeTrustProfile } from './trust.js';

export class MeService {
  private async buildTrustProfile(user: typeof users.$inferSelect, hasTosConsent: boolean) {
    const userRequests = await db
      .select()
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.userId, user.id),
          eq(verificationRequests.status, 'approved'),
        ),
      );

    const now = new Date();
    const hasGovtIdVerified = userRequests.some(
      (r) => r.kind === 'govt_id' && (!r.expiresOn || r.expiresOn > now),
    );
    const hasDrivingLicenceApproved = userRequests.some(
      (r) => r.kind === 'driving_licence' && (!r.expiresOn || r.expiresOn > now),
    );
    let hasVehicleRcApproved = userRequests.some((r) => r.kind === 'vehicle_rc');
    let hasInsuranceValid = userRequests.some(
      (r) => r.kind === 'insurance' && (!r.expiresOn || r.expiresOn > now),
    );

    const userVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.ownerId, user.id),
          eq(vehicles.status, 'verified'),
          isNull(vehicles.deletedAt),
        ),
      );

    if (userVehicles.length > 0) {
      hasVehicleRcApproved = true;
      if (userVehicles.some((v) => v.insuranceValidUntil > now)) {
        hasInsuranceValid = true;
      }
    }

    const isCollegeEmail =
      user.email.endsWith('.edu') ||
      user.email.endsWith('.ac.in') ||
      user.email.includes('.edu.') ||
      user.email.includes('.ac.');
    const effectiveCollegeVerifiedAt =
      user.collegeVerifiedAt ?? (isCollegeEmail ? user.emailVerifiedAt : null);

    return computeTrustProfile({
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      adultConfirmedAt: user.adultConfirmedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      collegeVerifiedAt: effectiveCollegeVerifiedAt,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt,
      hasTosConsent,
      hasGovtIdVerified,
      hasDrivingLicenceApproved,
      hasVehicleRcApproved,
      hasInsuranceValid,
    });
  }

  async getProfile(userId: string): Promise<MeProfileResponse> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const userConsents = await db
      .select()
      .from(consents)
      .where(and(eq(consents.userId, userId), isNull(consents.revokedAt)));

    const hasTosConsent = userConsents.some((c) => c.kind === 'tos');
    const trustProfile = await this.buildTrustProfile(user, hasTosConsent);

    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() || null,
      phoneE164: user.phoneE164,
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() || null,
      fullName: user.fullName,
      photoKey: user.photoKey,
      memberType: user.memberType,
      role: user.role,
      status: user.status,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt?.toISOString() || null,
      collegeVerifiedAt: user.collegeVerifiedAt?.toISOString() || null,
      department: user.department,
      academicYear: user.academicYear ? parseInt(user.academicYear, 10) : null,
      adultConfirmedAt: user.adultConfirmedAt?.toISOString() || null,
      privacy: (user.privacy as Record<string, unknown>) || {},
      locale: user.locale,
      trustTier: trustProfile.tier,
      badges: trustProfile.badges,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(
    userId: string,
    input: UpdateProfile,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<MeProfileResponse> {
    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.fullName !== undefined) updates.fullName = input.fullName;
    if (input.gender !== undefined) updates.gender = input.gender;
    if (input.department !== undefined) updates.department = input.department;
    if (input.academicYear !== undefined) updates.academicYear = input.academicYear.toString();
    if (input.locale !== undefined) updates.locale = input.locale;

    await db.update(users).set(updates).where(eq(users.id, userId));

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'user.update_profile',
      entity: 'users',
      entityId: userId,
      before: { fullName: existing.fullName, gender: existing.gender },
      after: updates,
      ipHash: ipHashed,
      requestId,
    });

    return this.getProfile(userId);
  }

  async recordConsents(
    userId: string,
    submission: ConsentSubmission,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<{ message: string }> {
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    const now = new Date();

    if (submission.adultConfirmed) {
      await db
        .update(users)
        .set({ adultConfirmedAt: now, updatedAt: now })
        .where(eq(users.id, userId));
    }

    for (const consentItem of submission.consents) {
      if (consentItem.granted) {
        // Insert new consent grant
        await db.insert(consents).values({
          userId,
          kind: consentItem.kind,
          version: consentItem.version,
          ipHash: ipHashed,
          grantedAt: now,
        });
      } else {
        // Revoke active consent
        await db
          .update(consents)
          .set({ revokedAt: now })
          .where(
            and(
              eq(consents.userId, userId),
              eq(consents.kind, consentItem.kind),
              isNull(consents.revokedAt),
            ),
          );
      }
    }

    await auditService.log({
      actorId: userId,
      action: 'consents.updated',
      entity: 'consents',
      entityId: userId,
      after: submission,
      ipHash: ipHashed,
      requestId,
    });

    return { message: 'Consents updated successfully.' };
  }

  async getTrust(userId: string): Promise<TrustProfileResponse> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const userConsents = await db
      .select()
      .from(consents)
      .where(and(eq(consents.userId, userId), isNull(consents.revokedAt)));

    const hasTosConsent = userConsents.some((c) => c.kind === 'tos');
    return this.buildTrustProfile(user, hasTosConsent);
  }

  async getPhotoUploadUrl(
    userId: string,
    contentType: 'image/jpeg' | 'image/png' | 'image/webp',
  ): Promise<{ uploadUrl: string; key: string; expiresInSeconds: number }> {
    const ext = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : 'jpg';
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;
    const storage = getStorageProvider();
    return storage.getPresignedUploadUrl(key, contentType, 300);
  }

  async requestPhoneOtp(
    userId: string,
    phone: string,
    ipAddress = '127.0.0.1',
    _requestId = 'unknown',
  ): Promise<{ message: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const otp = generateOtp();
    const codeHmac = hashOtp(otp, env.OTP_HMAC_PEPPER);
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(authOtpChallenges).values({
      email: `phone:${phone}`,
      codeHmac,
      expiresAt,
      attempts: 0,
      ipHash: ipHashed,
    });

    const smsProvider = getSmsProvider();
    await smsProvider.sendOtp({
      phone,
      otp,
      expiryMinutes: 10,
    });

    return { message: 'Verification code sent to your phone.' };
  }

  async verifyPhoneOtp(
    userId: string,
    phone: string,
    code: string,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<{ message: string; tier: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const now = new Date();
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);

    // Look for latest active challenge
    const [challenge] = await db
      .select()
      .from(authOtpChallenges)
      .where(
        and(
          eq(authOtpChallenges.email, `phone:${phone}`),
          isNull(authOtpChallenges.consumedAt),
          gt(authOtpChallenges.expiresAt, now),
        ),
      )
      .orderBy(desc(authOtpChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.');
    }

    if (challenge.attempts >= 5) {
      throw new AppError(
        'RATE_LIMITED',
        429,
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    const isValid = verifyOtpHash(code, challenge.codeHmac, env.OTP_HMAC_PEPPER);
    if (!isValid) {
      await db
        .update(authOtpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(authOtpChallenges.id, challenge.id));

      throw new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.');
    }

    // Mark challenge consumed
    await db
      .update(authOtpChallenges)
      .set({ consumedAt: now })
      .where(eq(authOtpChallenges.id, challenge.id));

    // Ensure phone is not already in use by another user
    const [existingWithPhone] = await db
      .select()
      .from(users)
      .where(and(eq(users.phoneE164, phone), ne(users.id, userId)))
      .limit(1);

    if (existingWithPhone) {
      throw new AppError('CONFLICT', 409, 'This phone number is already linked to another account.');
    }

    // Update user phone
    await db
      .update(users)
      .set({
        phoneE164: phone,
        phoneVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    await auditService.log({
      actorId: userId,
      action: 'user.phone_verified',
      entity: 'users',
      entityId: userId,
      ipHash: ipHashed,
      requestId,
    });

    const trust = await this.getTrust(userId);
    return { message: 'Phone verified successfully.', tier: trust.tier };
  }
}

export const meService = new MeService();
