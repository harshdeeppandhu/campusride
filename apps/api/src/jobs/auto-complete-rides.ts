import { and, sql, inArray, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { rides } from '../db/schema.js';
import { logger } from '../lib/logger.js';

export interface AutoCompleteResult {
  scanned: number;
  completed: number;
  errors: number;
}

/**
 * Auto-completes rides that are 'scheduled' or 'in_progress' where
 * ETA + 12 hours <= now (per docs/01 FR-RIDE-08 and docs/10 §M4).
 */
export async function autoCompleteExpiredRides(now = new Date()): Promise<AutoCompleteResult> {
  // departs_at + (duration_s * interval '1 second') + interval '12 hours' <= now
  const cutoff = now;

  const expiredRides = await db
    .select({
      id: rides.id,
      driverId: rides.driverId,
      status: rides.status,
    })
    .from(rides)
    .where(
      and(
        inArray(rides.status, ['scheduled', 'in_progress']),
        sql`(${rides.departsAt} + (${rides.durationS} * interval '1 second') + interval '12 hours') <= ${cutoff}`,
      ),
    );

  let completed = 0;
  let errors = 0;

  for (const ride of expiredRides) {
    try {
      await db
        .update(rides)
        .set({
          status: 'completed',
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(rides.id, ride.id));

      completed += 1;
      logger.info(
        { rideId: ride.id, driverId: ride.driverId, previousStatus: ride.status },
        'Ride automatically transitioned to completed 12h post-ETA',
      );
    } catch (err) {
      errors += 1;
      logger.error({ err, rideId: ride.id }, 'Failed to auto-complete ride');
    }
  }

  logger.info({ scanned: expiredRides.length, completed, errors }, 'Auto-complete rides job finished');
  return {
    scanned: expiredRides.length,
    completed,
    errors,
  };
}
