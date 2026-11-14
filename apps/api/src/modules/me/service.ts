import { eq, and, isNull } from 'drizzle-orm';
import type {
  ConsentSubmission,
  UpdateProfile,
  MeProfileResponse,
  TrustProfileResponse,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import { users, consents } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { hashIp } from '../auth/tokens.js';
import { auditService } from '../audit/service.js';
import { computeTrustProfile } from './trust.js';

export class MeService {
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
    const trustProfile = computeTrustProfile({
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      adultConfirmedAt: user.adultConfirmedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      collegeVerifiedAt: user.collegeVerifiedAt,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt,
      hasTosConsent,
    });

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
    const trust = computeTrustProfile({
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      adultConfirmedAt: user.adultConfirmedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      collegeVerifiedAt: user.collegeVerifiedAt,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt,
      hasTosConsent,
    });

    return trust;
  }
}

export const meService = new MeService();
