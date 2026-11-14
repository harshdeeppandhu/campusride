import { db } from '../../db/client.js';
import { auditLog } from '../../db/schema.js';
import { logger } from '../../lib/logger.js';

export interface AuditLogEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash: string;
  requestId: string;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLog).values({
        actorId: entry.actorId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        before: entry.before || null,
        after: entry.after || null,
        ipHash: entry.ipHash,
        requestId: entry.requestId,
      });
    } catch (err) {
      // Audit log failures must be reported in logs but should never crash the user-facing request
      logger.error({ err, entry }, 'Failed to record audit log entry');
    }
  }
}

export const auditService = new AuditService();
