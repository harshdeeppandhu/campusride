import { describe, it, expect } from 'vitest';
import {
  canTransitionRide,
  assertValidRideTransition,
  canTransitionBooking,
  assertValidBookingTransition,
  InvalidStateTransitionError,
} from '../state-machines.js';
import { RideStatus, BookingStatus, UserRole } from '../enums.js';

describe('Ride State Machine', () => {
  it('allows scheduled -> in_progress', () => {
    expect(canTransitionRide(RideStatus.SCHEDULED, RideStatus.IN_PROGRESS)).toBe(true);
    expect(() =>
      assertValidRideTransition(RideStatus.SCHEDULED, RideStatus.IN_PROGRESS),
    ).not.toThrow();
  });

  it('allows scheduled -> cancelled', () => {
    expect(canTransitionRide(RideStatus.SCHEDULED, RideStatus.CANCELLED)).toBe(true);
  });

  it('allows in_progress -> completed', () => {
    expect(canTransitionRide(RideStatus.IN_PROGRESS, RideStatus.COMPLETED)).toBe(true);
  });

  it('allows in_progress -> cancelled ONLY for safety_admin or admin', () => {
    // Normal member should be rejected
    expect(
      canTransitionRide(
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED,
        UserRole.MEMBER,
      ),
    ).toBe(false);
    expect(() =>
      assertValidRideTransition(
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED,
        UserRole.MEMBER,
      ),
    ).toThrow(InvalidStateTransitionError);

    // Safety admin should be allowed
    expect(
      canTransitionRide(
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED,
        UserRole.SAFETY_ADMIN,
      ),
    ).toBe(true);

    // Admin should be allowed
    expect(
      canTransitionRide(
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED,
        UserRole.ADMIN,
      ),
    ).toBe(true);
  });

  it('rejects completed -> in_progress / cancelled (terminal state)', () => {
    expect(canTransitionRide(RideStatus.COMPLETED, RideStatus.IN_PROGRESS)).toBe(false);
    expect(canTransitionRide(RideStatus.COMPLETED, RideStatus.CANCELLED)).toBe(false);
    expect(() =>
      assertValidRideTransition(RideStatus.COMPLETED, RideStatus.IN_PROGRESS),
    ).toThrow(InvalidStateTransitionError);
  });

  it('rejects cancelled -> scheduled / in_progress (terminal state)', () => {
    expect(canTransitionRide(RideStatus.CANCELLED, RideStatus.SCHEDULED)).toBe(false);
    expect(() =>
      assertValidRideTransition(RideStatus.CANCELLED, RideStatus.SCHEDULED),
    ).toThrow(InvalidStateTransitionError);
  });

  it('allows idempotent transitions (same state)', () => {
    expect(canTransitionRide(RideStatus.SCHEDULED, RideStatus.SCHEDULED)).toBe(true);
    expect(canTransitionRide(RideStatus.COMPLETED, RideStatus.COMPLETED)).toBe(true);
  });
});

describe('Booking State Machine', () => {
  it('allows requested -> accepted, rejected, cancelled_by_passenger, expired', () => {
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.ACCEPTED)).toBe(true);
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.REJECTED)).toBe(true);
    expect(
      canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.CANCELLED_BY_PASSENGER),
    ).toBe(true);
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.EXPIRED)).toBe(true);
  });

  it('rejects requested -> completed / no_show without being accepted first', () => {
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.COMPLETED)).toBe(false);
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.NO_SHOW)).toBe(false);
    expect(() =>
      assertValidBookingTransition(BookingStatus.REQUESTED, BookingStatus.COMPLETED),
    ).toThrow(InvalidStateTransitionError);
  });

  it('allows accepted -> cancelled_by_passenger, cancelled_by_driver, completed, no_show', () => {
    expect(
      canTransitionBooking(BookingStatus.ACCEPTED, BookingStatus.CANCELLED_BY_PASSENGER),
    ).toBe(true);
    expect(
      canTransitionBooking(BookingStatus.ACCEPTED, BookingStatus.CANCELLED_BY_DRIVER),
    ).toBe(true);
    expect(canTransitionBooking(BookingStatus.ACCEPTED, BookingStatus.COMPLETED)).toBe(true);
    expect(canTransitionBooking(BookingStatus.ACCEPTED, BookingStatus.NO_SHOW)).toBe(true);
  });

  it('allows waitlisted -> requested, cancelled_by_passenger, expired', () => {
    expect(canTransitionBooking(BookingStatus.WAITLISTED, BookingStatus.REQUESTED)).toBe(true);
    expect(
      canTransitionBooking(BookingStatus.WAITLISTED, BookingStatus.CANCELLED_BY_PASSENGER),
    ).toBe(true);
    expect(canTransitionBooking(BookingStatus.WAITLISTED, BookingStatus.EXPIRED)).toBe(true);
  });

  it('rejects transitions from terminal states', () => {
    const terminalStates = [
      BookingStatus.REJECTED,
      BookingStatus.CANCELLED_BY_PASSENGER,
      BookingStatus.CANCELLED_BY_DRIVER,
      BookingStatus.EXPIRED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ] as const;

    for (const state of terminalStates) {
      expect(canTransitionBooking(state, BookingStatus.ACCEPTED)).toBe(false);
      expect(canTransitionBooking(state, BookingStatus.REQUESTED)).toBe(false);
      expect(() =>
        assertValidBookingTransition(state, BookingStatus.ACCEPTED),
      ).toThrow(InvalidStateTransitionError);
    }
  });

  it('allows idempotent transitions (same state)', () => {
    expect(canTransitionBooking(BookingStatus.REQUESTED, BookingStatus.REQUESTED)).toBe(true);
    expect(canTransitionBooking(BookingStatus.ACCEPTED, BookingStatus.ACCEPTED)).toBe(true);
  });
});
