/**
 * CampusRide – Enums and constants shared across all apps.
 * These are the canonical values; DB enums mirror these.
 */

export const MemberType = {
  STUDENT: 'student',
  STAFF: 'staff',
  COMMUNITY: 'community',
} as const;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

export const UserRole = {
  MEMBER: 'member',
  ADMIN: 'admin',
  SAFETY_ADMIN: 'safety_admin',
  ANALYST: 'analyst',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const Gender = {
  FEMALE: 'female',
  MALE: 'male',
  NON_BINARY: 'non_binary',
  UNDISCLOSED: 'undisclosed',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const VehicleType = {
  CAR: 'car',
  BIKE: 'bike',
  SCOOTER: 'scooter',
  AUTO: 'auto',
  OTHER: 'other',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const VehicleStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const PlaceKind = {
  HUB: 'hub',
  CAMPUS: 'campus',
  CUSTOM: 'custom',
} as const;
export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind];

export const JourneyType = {
  LOCAL: 'local',
  OUTSTATION: 'outstation',
} as const;
export type JourneyType = (typeof JourneyType)[keyof typeof JourneyType];

export const AudienceScope = {
  CAMPUS_ONLY: 'campus_only',
  CAMPUS_AND_COMMUNITY: 'campus_and_community',
} as const;
export type AudienceScope = (typeof AudienceScope)[keyof typeof AudienceScope];

export const GenderScope = {
  ANY: 'any',
  WOMEN_ONLY: 'women_only',
} as const;
export type GenderScope = (typeof GenderScope)[keyof typeof GenderScope];

export const RideStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

export const BookingStatus = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED_BY_PASSENGER: 'cancelled_by_passenger',
  CANCELLED_BY_DRIVER: 'cancelled_by_driver',
  EXPIRED: 'expired',
  WAITLISTED: 'waitlisted',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const CancelKind = {
  NORMAL: 'normal',
  UNCOMFORTABLE: 'uncomfortable',
  EMERGENCY: 'emergency',
} as const;
export type CancelKind = (typeof CancelKind)[keyof typeof CancelKind];

export const VerificationKind = {
  COLLEGE_ID: 'college_id',
  GOVT_ID: 'govt_id',
  SELFIE: 'selfie',
  DRIVING_LICENCE: 'driving_licence',
  VEHICLE_RC: 'vehicle_rc',
  INSURANCE: 'insurance',
} as const;
export type VerificationKind = (typeof VerificationKind)[keyof typeof VerificationKind];

export const VerificationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const TrustTier = {
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
} as const;
export type TrustTier = (typeof TrustTier)[keyof typeof TrustTier];

export const ReportCategory = {
  HARASSMENT: 'harassment',
  UNSAFE_DRIVING: 'unsafe_driving',
  NO_SHOW: 'no_show',
  FAKE_PROFILE: 'fake_profile',
  VEHICLE_MISMATCH: 'vehicle_mismatch',
  OTHER: 'other',
} as const;
export type ReportCategory = (typeof ReportCategory)[keyof typeof ReportCategory];

export const ReportStatus = {
  OPEN: 'open',
  TRIAGED: 'triaged',
  ACTION_TAKEN: 'action_taken',
  DISMISSED: 'dismissed',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type ReportSeverity = (typeof ReportSeverity)[keyof typeof ReportSeverity];

export const SosStatus = {
  TRIGGERED: 'triggered',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  FALSE_ALARM: 'false_alarm',
} as const;
export type SosStatus = (typeof SosStatus)[keyof typeof SosStatus];

export const ConsentKind = {
  TOS: 'tos',
  PRIVACY: 'privacy',
  LOCATION: 'location',
  SOS_CONTACT_NOTICE: 'sos_contact_notice',
} as const;
export type ConsentKind = (typeof ConsentKind)[keyof typeof ConsentKind];

export const SettleMethod = {
  CASH: 'cash',
  UPI: 'upi',
  OTHER: 'other',
} as const;
export type SettleMethod = (typeof SettleMethod)[keyof typeof SettleMethod];

/** Two-wheelers can carry at most 1 passenger (excl. driver) */
export const TWO_WHEELER_MAX_PASSENGERS = 1;

/** Default vehicle capacity limits */
export const VEHICLE_MAX_PASSENGERS: Record<VehicleType, number> = {
  car: 6,
  bike: TWO_WHEELER_MAX_PASSENGERS,
  scooter: TWO_WHEELER_MAX_PASSENGERS,
  auto: 3,
  other: 6,
};

/** Minimum minutes in the future for ride departure */
export const RIDE_MIN_FUTURE_MINUTES = 30;
/** Maximum days in the future for ride departure */
export const RIDE_MAX_FUTURE_DAYS = 60;
/** Driver accept window in hours */
export const BOOKING_ACCEPT_WINDOW_HOURS = 24;
/** Auto-complete ride N hours after ETA */
export const RIDE_AUTOCOMPLETE_HOURS_AFTER_ETA = 12;
/** Review window in days after completion */
export const REVIEW_WINDOW_DAYS = 14;
/** Max trusted contacts per user */
export const TRUSTED_CONTACTS_MAX = 5;
/** Trip share token expiry in hours */
export const TRIP_SHARE_EXPIRY_HOURS = 24;
/** Location ping retention in days */
export const LOCATION_PING_RETENTION_DAYS = 30;
/** SOS event retention in days */
export const SOS_RETENTION_DAYS = 365;
/** Audit log retention in days */
export const AUDIT_LOG_RETENTION_DAYS = 730;
/** Doc image purge after decision in days */
export const DOC_PURGE_AFTER_DAYS = 30;
/** k-anonymity minimum group size for analytics */
export const ANALYTICS_K_ANON_MIN = 5;
/** OutSTATION threshold in metres */
export const OUTSTATION_THRESHOLD_M = 40_000;
/** Privacy window: phone/pickup exposed N hours after departure */
export const PRIVACY_WINDOW_AFTER_DEPARTURE_HOURS = 24;
