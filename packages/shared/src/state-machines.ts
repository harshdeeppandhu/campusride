import {
  type RideStatus,
  type BookingStatus,
  type UserRole,
  RideStatus as RideStatuses,
  BookingStatus as BookingStatuses,
  UserRole as UserRoles,
} from './enums.js';
import { ErrorCode } from './error-codes.js';

export class InvalidStateTransitionError extends Error {
  public readonly code = ErrorCode.INVALID_STATE_TRANSITION;
  public readonly httpStatus = 409;

  constructor(
    public readonly entity: 'ride' | 'booking',
    public readonly from: string,
    public readonly to: string,
    public readonly reason?: string,
  ) {
    super(
      `Cannot transition ${entity} from '${from}' to '${to}'${reason ? `: ${reason}` : '.'}`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Ride State Machine
 * scheduled -> in_progress -> completed
 * scheduled -> cancelled (driver or admin)
 * in_progress -> cancelled (ONLY safety_admin / admin per docs/03 §2)
 */
export const ALLOWED_RIDE_TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  [RideStatuses.SCHEDULED]: [RideStatuses.IN_PROGRESS, RideStatuses.CANCELLED],
  [RideStatuses.IN_PROGRESS]: [RideStatuses.COMPLETED, RideStatuses.CANCELLED],
  [RideStatuses.COMPLETED]: [],
  [RideStatuses.CANCELLED]: [],
} as const;

export function canTransitionRide(
  from: RideStatus,
  to: RideStatus,
  actorRole?: UserRole,
): boolean {
  if (from === to) return true; // idempotent
  const allowed = ALLOWED_RIDE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) return false;

  // in_progress -> cancelled is ONLY allowed by safety_admin or admin
  if (from === RideStatuses.IN_PROGRESS && to === RideStatuses.CANCELLED) {
    return actorRole === UserRoles.SAFETY_ADMIN || actorRole === UserRoles.ADMIN;
  }

  return true;
}

export function assertValidRideTransition(
  from: RideStatus,
  to: RideStatus,
  actorRole?: UserRole,
): void {
  if (!canTransitionRide(from, to, actorRole)) {
    if (from === RideStatuses.IN_PROGRESS && to === RideStatuses.CANCELLED) {
      throw new InvalidStateTransitionError(
        'ride',
        from,
        to,
        'Only safety administrators can cancel an in-progress ride',
      );
    }
    throw new InvalidStateTransitionError('ride', from, to);
  }
}

/**
 * Booking State Machine
 * requested -> accepted | rejected | cancelled_by_passenger | expired
 * accepted -> cancelled_by_passenger | cancelled_by_driver | completed | no_show
 * waitlisted -> requested | cancelled_by_passenger | expired
 * completed / rejected / cancelled / expired / no_show are terminal
 */
export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatuses.REQUESTED]: [
    BookingStatuses.ACCEPTED,
    BookingStatuses.REJECTED,
    BookingStatuses.CANCELLED_BY_PASSENGER,
    BookingStatuses.EXPIRED,
  ],
  [BookingStatuses.ACCEPTED]: [
    BookingStatuses.CANCELLED_BY_PASSENGER,
    BookingStatuses.CANCELLED_BY_DRIVER,
    BookingStatuses.COMPLETED,
    BookingStatuses.NO_SHOW,
  ],
  [BookingStatuses.WAITLISTED]: [
    BookingStatuses.REQUESTED,
    BookingStatuses.CANCELLED_BY_PASSENGER,
    BookingStatuses.EXPIRED,
  ],
  [BookingStatuses.REJECTED]: [],
  [BookingStatuses.CANCELLED_BY_PASSENGER]: [],
  [BookingStatuses.CANCELLED_BY_DRIVER]: [],
  [BookingStatuses.EXPIRED]: [],
  [BookingStatuses.COMPLETED]: [],
  [BookingStatuses.NO_SHOW]: [],
} as const;

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true; // idempotent
  const allowed = ALLOWED_BOOKING_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function assertValidBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (!canTransitionBooking(from, to)) {
    throw new InvalidStateTransitionError('booking', from, to);
  }
}
