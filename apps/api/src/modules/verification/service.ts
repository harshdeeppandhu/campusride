import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import type {
  UploadUrlRequest,
  UploadUrlResponse,
  CreateVerificationRequest,
  VerificationRequestResponse,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import { verificationRequests, users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { encryptField } from '../../lib/crypto.js';
import { getStorageProvider } from '../../integrations/storage/index.js';
import { auditService } from '../audit/service.js';
import { hashIp } from '../auth/tokens.js';
import { env } from '../../config/env.js';

export class VerificationService {
  async getUploadUrl(
    userId: string,
    input: UploadUrlRequest,
  ): Promise<UploadUrlResponse> {
    const ext = input.contentType === 'application/pdf'
      ? 'pdf'
      : input.contentType.split('/')[1] || 'bin';

    const key = `docs/${userId}/${randomUUID()}.${ext}`;
    const storage = getStorageProvider();
    const result = await storage.getPresignedUploadUrl(key, input.contentType, 300);

    return result;
  }

  async createRequest(
    userId: string,
    input: CreateVerificationRequest,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<VerificationRequestResponse> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found.');
    }

    const encryptedLast4 = input.docLast4 ? encryptField(input.docLast4) : null;
    const expiresOn = input.expiresOn ? new Date(input.expiresOn) : null;
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days retention

    const [created] = await db
      .insert(verificationRequests)
      .values({
        userId,
        kind: input.kind,
        vehicleId: input.vehicleId || null,
        docKey: input.docKey,
        docLast4: encryptedLast4,
        status: 'pending',
        expiresOn,
        purgeAfter,
      })
      .returning();

    if (!created) {
      throw new AppError('INTERNAL', 500, 'Failed to submit verification request.');
    }

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'verification.submitted',
      entity: 'verification_requests',
      entityId: created.id,
      after: { kind: created.kind, vehicleId: created.vehicleId },
      ipHash: ipHashed,
      requestId,
    });

    return {
      id: created.id,
      userId: created.userId,
      kind: created.kind,
      vehicleId: created.vehicleId,
      docKey: created.docKey,
      status: created.status,
      reviewedBy: created.reviewedBy,
      reviewedAt: created.reviewedAt?.toISOString() || null,
      rejectReason: created.rejectReason,
      expiresOn: created.expiresOn?.toISOString() || null,
      purgeAfter: created.purgeAfter?.toISOString() || null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getMyRequests(userId: string): Promise<VerificationRequestResponse[]> {
    const rows = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.userId, userId))
      .orderBy(desc(verificationRequests.createdAt));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      kind: r.kind,
      vehicleId: r.vehicleId,
      docKey: r.docKey,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      rejectReason: r.rejectReason,
      expiresOn: r.expiresOn?.toISOString() || null,
      purgeAfter: r.purgeAfter?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export const verificationService = new VerificationService();
