import { and, lte, isNotNull, inArray, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { verificationRequests } from '../db/schema.js';
import { getStorageProvider } from '../integrations/storage/index.js';
import { logger } from '../lib/logger.js';

export interface PurgeDocsResult {
  scanned: number;
  purged: number;
  errors: number;
}

/**
 * Purges document files from storage for verification requests whose retention
 * period has expired (30 days post-decision per docs/12 D-08).
 * Sets doc_key = null on the database record so PII is not retained indefinitely.
 */
export async function purgeExpiredDocuments(now = new Date()): Promise<PurgeDocsResult> {
  const expiredRequests = await db
    .select({
      id: verificationRequests.id,
      docKey: verificationRequests.docKey,
      userId: verificationRequests.userId,
      kind: verificationRequests.kind,
    })
    .from(verificationRequests)
    .where(
      and(
        lte(verificationRequests.purgeAfter, now),
        isNotNull(verificationRequests.docKey),
        inArray(verificationRequests.status, ['approved', 'rejected']),
      ),
    );

  const storage = getStorageProvider();
  let purged = 0;
  let errors = 0;

  for (const req of expiredRequests) {
    if (!req.docKey) continue;

    try {
      await storage.delete(req.docKey);

      await db
        .update(verificationRequests)
        .set({ docKey: null })
        .where(eq(verificationRequests.id, req.id));

      purged += 1;
      logger.info(
        { requestId: req.id, kind: req.kind, userId: req.userId },
        'Document image purged from storage per retention policy',
      );
    } catch (err) {
      errors += 1;
      logger.error(
        { err, requestId: req.id, docKey: req.docKey },
        'Failed to purge document image from storage',
      );
    }
  }

  logger.info({ scanned: expiredRequests.length, purged, errors }, 'Document purge job completed');
  return {
    scanned: expiredRequests.length,
    purged,
    errors,
  };
}
