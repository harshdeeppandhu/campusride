/**
 * CampusRide – Stable error code strings.
 * These are returned in `application/problem+json` responses as `code`.
 * Never change a code once published — add new ones.
 */

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  TIER_REQUIRED: 'TIER_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  SEATS_UNAVAILABLE: 'SEATS_UNAVAILABLE',
  RIDE_NOT_BOOKABLE: 'RIDE_NOT_BOOKABLE',
  BLOCKED: 'BLOCKED',
  ELIGIBILITY_FAILED: 'ELIGIBILITY_FAILED',
  IDEMPOTENCY_MISMATCH: 'IDEMPOTENCY_MISMATCH',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
