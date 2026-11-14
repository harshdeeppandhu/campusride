import { eq, and, desc } from 'drizzle-orm';
import type {
  AdminVerificationDecision,
  VerificationKind,
  VerificationStatus,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import {
  users,
  vehicles,
  verificationRequests,
} from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { decryptField } from '../../lib/crypto.js';
import { getStorageProvider } from '../../integrations/storage/index.js';
import { auditService } from '../audit/service.js';
import { hashIp } from '../auth/tokens.js';
import { env } from '../../config/env.js';
import { invalidateUserStatusCache } from '../../middleware/auth.js';

export interface AdminQueueItem {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string | null;
  userMemberType: string;
  userGender: string;
  genderVerifiedAt: string | null;
  kind: VerificationKind;
  vehicleId: string | null;
  vehicleMakeModel?: string | null;
  vehicleRegNumber?: string | null;
  docKey: string | null;
  docLast4: string | null;
  status: VerificationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  expiresOn: string | null;
  purgeAfter: string | null;
  createdAt: string;
}

export class AdminService {
  /**
   * Retrieves pending or filtered verification requests for admin review.
   */
  async getVerificationQueue(filter?: {
    kind?: VerificationKind | undefined;
    status?: VerificationStatus | undefined;
  }): Promise<AdminQueueItem[]> {
    const statusToFilter = filter?.status ?? 'pending';

    const baseConditions = [eq(verificationRequests.status, statusToFilter)];
    if (filter?.kind) {
      baseConditions.push(eq(verificationRequests.kind, filter.kind));
    }

    const rows = await db
      .select({
        id: verificationRequests.id,
        userId: verificationRequests.userId,
        userEmail: users.email,
        userFullName: users.fullName,
        userMemberType: users.memberType,
        userGender: users.gender,
        genderVerifiedAt: users.genderVerifiedAt,
        kind: verificationRequests.kind,
        vehicleId: verificationRequests.vehicleId,
        vehicleMakeModel: vehicles.makeModel,
        vehicleRegNumber: vehicles.registrationNumber,
        docKey: verificationRequests.docKey,
        docLast4: verificationRequests.docLast4,
        status: verificationRequests.status,
        reviewedBy: verificationRequests.reviewedBy,
        reviewedAt: verificationRequests.reviewedAt,
        rejectReason: verificationRequests.rejectReason,
        expiresOn: verificationRequests.expiresOn,
        purgeAfter: verificationRequests.purgeAfter,
        createdAt: verificationRequests.createdAt,
      })
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.userId, users.id))
      .leftJoin(vehicles, eq(verificationRequests.vehicleId, vehicles.id))
      .where(and(...baseConditions))
      .orderBy(desc(verificationRequests.createdAt));

    return rows.map((r) => {
      let decryptedLast4: string | null = null;
      if (r.docLast4) {
        try {
          decryptedLast4 = decryptField(r.docLast4);
        } catch {
          decryptedLast4 = null;
        }
      }

      return {
        id: r.id,
        userId: r.userId,
        userEmail: r.userEmail,
        userFullName: r.userFullName,
        userMemberType: r.userMemberType,
        userGender: r.userGender,
        genderVerifiedAt: r.genderVerifiedAt?.toISOString() || null,
        kind: r.kind,
        vehicleId: r.vehicleId,
        vehicleMakeModel: r.vehicleMakeModel ?? null,
        vehicleRegNumber: r.vehicleRegNumber ?? null,
        docKey: r.docKey,
        docLast4: decryptedLast4,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        rejectReason: r.rejectReason,
        expiresOn: r.expiresOn?.toISOString() || null,
        purgeAfter: r.purgeAfter?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  /**
   * Generates a short-lived 60-second signed download URL for an admin to view a document.
   * Every view is audited.
   */
  async getDocumentDownloadUrl(
    adminId: string,
    requestId: string,
    ipAddress = '127.0.0.1',
    reqId = 'unknown',
  ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new AppError('NOT_FOUND', 404, 'Verification request not found.');
    }

    if (!request.docKey) {
      throw new AppError(
        'NOT_FOUND',
        404,
        'Document image has been purged according to the retention policy.',
      );
    }

    const storage = getStorageProvider();
    // 60-second presigned GET per docs/05
    const downloadUrl = await storage.getPresignedDownloadUrl(request.docKey, 60);

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: adminId,
      action: 'verification.doc_viewed',
      entity: 'verification_requests',
      entityId: requestId,
      after: { targetUserId: request.userId, kind: request.kind },
      ipHash: ipHashed,
      requestId: reqId,
    });

    return {
      downloadUrl,
      expiresInSeconds: 60,
    };
  }

  /**
   * Records an admin review decision (approve or reject) for a verification request.
   */
  async recordDecision(
    adminId: string,
    requestId: string,
    input: AdminVerificationDecision,
    ipAddress = '127.0.0.1',
    reqId = 'unknown',
  ): Promise<{ message: string; status: VerificationStatus }> {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new AppError('NOT_FOUND', 404, 'Verification request not found.');
    }

    if (request.status !== 'pending') {
      throw new AppError(
        'CONFLICT',
        409,
        `Verification request has already been reviewed with status '${request.status}'.`,
      );
    }

    if (input.decision === 'rejected' && (!input.rejectReason || input.rejectReason.trim().length === 0)) {
      throw new AppError('VALIDATION_ERROR', 400, 'A rejection reason is required when rejecting a document.');
    }

    const now = new Date();
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days retention per D-08

    // Update request
    await db
      .update(verificationRequests)
      .set({
        status: input.decision,
        reviewedBy: adminId,
        reviewedAt: now,
        rejectReason: (input.decision === 'rejected' ? input.rejectReason : null) ?? null,
        purgeAfter,
      })
      .where(eq(verificationRequests.id, requestId));

    // If approved, update corresponding user or vehicle status
    if (input.decision === 'approved') {
      if (request.kind === 'college_id') {
        await db
          .update(users)
          .set({ collegeVerifiedAt: now, updatedAt: now })
          .where(eq(users.id, request.userId));
      } else if (
        (request.kind === 'vehicle_rc' || request.kind === 'insurance') &&
        request.vehicleId
      ) {
        // If vehicle associated, mark vehicle as verified
        await db
          .update(vehicles)
          .set({ status: 'verified', updatedAt: now })
          .where(eq(vehicles.id, request.vehicleId));
      }
    }

    invalidateUserStatusCache(request.userId);

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: adminId,
      action: 'verification.decision',
      entity: 'verification_requests',
      entityId: requestId,
      before: { status: request.status },
      after: {
        status: input.decision,
        rejectReason: input.rejectReason ?? null,
        targetUserId: request.userId,
        kind: request.kind,
      },
      ipHash: ipHashed,
      requestId: reqId,
    });

    return {
      message: `Verification request ${input.decision}.`,
      status: input.decision as VerificationStatus,
    };
  }

  /**
   * Sets or unsets gender-verified flag for a user. Restricted to admin role.
   * If verified and user self-declared gender is female, unlocks women_verified badge.
   */
  async setGenderVerified(
    adminId: string,
    targetUserId: string,
    verified: boolean,
    ipAddress = '127.0.0.1',
    reqId = 'unknown',
  ): Promise<{ message: string; genderVerifiedAt: string | null }> {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const now = new Date();
    const newGenderVerifiedAt = verified ? now : null;

    await db
      .update(users)
      .set({
        genderVerifiedAt: newGenderVerifiedAt,
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId));

    invalidateUserStatusCache(targetUserId);

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: adminId,
      action: 'user.set_gender_verified',
      entity: 'users',
      entityId: targetUserId,
      before: { genderVerifiedAt: targetUser.genderVerifiedAt },
      after: { genderVerifiedAt: newGenderVerifiedAt },
      ipHash: ipHashed,
      requestId: reqId,
    });

    return {
      message: verified
        ? 'User gender verified successfully.'
        : 'User gender verification removed.',
      genderVerifiedAt: newGenderVerifiedAt?.toISOString() || null,
    };
  }

  /**
   * Suspends a user account.
   */
  async suspendUser(
    adminId: string,
    targetUserId: string,
    reason?: string,
    ipAddress = '127.0.0.1',
    reqId = 'unknown',
  ): Promise<{ message: string }> {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const now = new Date();
    await db
      .update(users)
      .set({ status: 'suspended', updatedAt: now })
      .where(eq(users.id, targetUserId));

    invalidateUserStatusCache(targetUserId);

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: adminId,
      action: 'user.suspended',
      entity: 'users',
      entityId: targetUserId,
      before: { status: targetUser.status },
      after: { status: 'suspended', reason: reason ?? null },
      ipHash: ipHashed,
      requestId: reqId,
    });

    return { message: 'User suspended successfully.' };
  }

  /**
   * Restores a suspended user account.
   */
  async restoreUser(
    adminId: string,
    targetUserId: string,
    ipAddress = '127.0.0.1',
    reqId = 'unknown',
  ): Promise<{ message: string }> {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const now = new Date();
    await db
      .update(users)
      .set({ status: 'active', updatedAt: now })
      .where(eq(users.id, targetUserId));

    invalidateUserStatusCache(targetUserId);

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: adminId,
      action: 'user.restored',
      entity: 'users',
      entityId: targetUserId,
      before: { status: targetUser.status },
      after: { status: 'active' },
      ipHash: ipHashed,
      requestId: reqId,
    });

    return { message: 'User restored successfully.' };
  }
}

export const adminService = new AdminService();
