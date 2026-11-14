import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  check,
  uniqueIndex,
  index,
  date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { geographyPoint, geographyLineString } from './custom-types.js';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const memberTypeEnum = pgEnum('member_type', ['student', 'staff', 'community']);
export const userRoleEnum = pgEnum('user_role', ['member', 'admin', 'safety_admin', 'analyst']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const genderEnum = pgEnum('gender', ['female', 'male', 'non_binary', 'undisclosed']);
export const vehicleTypeEnum = pgEnum('vehicle_type', ['car', 'bike', 'scooter', 'auto', 'other']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['pending', 'verified', 'rejected', 'suspended']);
export const placeKindEnum = pgEnum('place_kind', ['hub', 'campus', 'custom']);
export const journeyTypeEnum = pgEnum('journey_type', ['local', 'outstation']);
export const audienceScopeEnum = pgEnum('audience_scope', ['campus_only', 'campus_and_community']);
export const genderScopeEnum = pgEnum('gender_scope', ['any', 'women_only']);
export const rideStatusEnum = pgEnum('ride_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
export const bookingStatusEnum = pgEnum('booking_status', [
  'requested',
  'accepted',
  'rejected',
  'cancelled_by_passenger',
  'cancelled_by_driver',
  'expired',
  'waitlisted',
  'completed',
  'no_show',
]);
export const cancelKindEnum = pgEnum('cancel_kind', ['normal', 'uncomfortable', 'emergency']);
export const verificationKindEnum = pgEnum('verification_kind', [
  'college_id',
  'govt_id',
  'selfie',
  'driving_licence',
  'vehicle_rc',
  'insurance',
]);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);
export const reportCategoryEnum = pgEnum('report_category', [
  'harassment',
  'unsafe_driving',
  'no_show',
  'fake_profile',
  'vehicle_mismatch',
  'other',
]);
export const reportStatusEnum = pgEnum('report_status', ['open', 'triaged', 'action_taken', 'dismissed']);
export const reportSeverityEnum = pgEnum('report_severity', ['low', 'medium', 'high', 'critical']);
export const sosStatusEnum = pgEnum('sos_status', ['triggered', 'acknowledged', 'resolved', 'false_alarm']);
export const consentKindEnum = pgEnum('consent_kind', ['tos', 'privacy', 'location', 'sos_contact_notice']);
export const settleMethodEnum = pgEnum('settle_method', ['cash', 'upi', 'other']);

// ─── 1. Users ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneE164: varchar('phone_e164', { length: 20 }).unique(),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    fullName: varchar('full_name', { length: 150 }).notNull(),
    photoKey: varchar('photo_key', { length: 255 }),
    memberType: memberTypeEnum('member_type').notNull(),
    role: userRoleEnum('role').notNull().default('member'),
    status: userStatusEnum('status').notNull().default('active'),
    gender: genderEnum('gender').notNull().default('undisclosed'),
    genderVerifiedAt: timestamp('gender_verified_at', { withTimezone: true }),
    collegeVerifiedAt: timestamp('college_verified_at', { withTimezone: true }),
    department: varchar('department', { length: 100 }),
    academicYear: varchar('academic_year', { length: 20 }),
    adultConfirmedAt: timestamp('adult_confirmed_at', { withTimezone: true }).notNull(),
    privacy: jsonb('privacy').notNull().default({}),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    isSynthetic: boolean('is_synthetic').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_status').on(table.status),
    index('idx_users_role').on(table.role),
  ],
);

// ─── 2. Consents ──────────────────────────────────────────────────────────────

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: consentKindEnum('kind').notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_consents_user').on(table.userId, table.kind),
  ],
);

// ─── 3. Auth OTP Challenges ───────────────────────────────────────────────────

export const authOtpChallenges = pgTable(
  'auth_otp_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    codeHmac: varchar('code_hmac', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_otp_email_created').on(table.email, table.createdAt),
  ],
);

// ─── 4. Auth Sessions ─────────────────────────────────────────────────────────

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    refreshHash: varchar('refresh_hash', { length: 128 }).notNull().unique(),
    userAgent: text('user_agent'),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_family').on(table.familyId),
  ],
);

// ─── 5. Vehicles ──────────────────────────────────────────────────────────────

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: vehicleTypeEnum('type').notNull(),
    makeModel: varchar('make_model', { length: 100 }).notNull(),
    colour: varchar('colour', { length: 50 }).notNull(),
    registrationNumber: varchar('registration_number', { length: 30 }).notNull(),
    passengerCapacity: integer('passenger_capacity').notNull(),
    insuranceValidUntil: timestamp('insurance_valid_until', { withTimezone: true }).notNull(),
    status: vehicleStatusEnum('status').notNull().default('pending'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'chk_vehicle_capacity',
      sql`passenger_capacity >= 1 AND passenger_capacity <= 6 AND (type NOT IN ('bike', 'scooter') OR passenger_capacity = 1)`,
    ),
    index('idx_vehicles_owner').on(table.ownerId),
    uniqueIndex('idx_vehicles_reg_active')
      .on(table.registrationNumber)
      .where(sql`deleted_at IS NULL`),
  ],
);

// ─── 6. Verification Requests ─────────────────────────────────────────────────

export const verificationRequests = pgTable(
  'verification_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: verificationKindEnum('kind').notNull(),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
    docKey: varchar('doc_key', { length: 255 }),
    docLast4: varchar('doc_last4', { length: 128 }),
    status: verificationStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectReason: text('reject_reason'),
    expiresOn: timestamp('expires_on', { withTimezone: true }),
    purgeAfter: timestamp('purge_after', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_verif_user').on(table.userId),
    index('idx_verif_status').on(table.status),
  ],
);

// ─── 7. Places ────────────────────────────────────────────────────────────────

export const places = pgTable(
  'places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull(),
    kind: placeKindEnum('kind').notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    location: geographyPoint('location').notNull(),
    address: text('address').notNull(),
    googlePlaceId: varchar('google_place_id', { length: 255 }).unique(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_places_kind').on(table.kind),
    index('idx_places_city').on(table.city),
    index('idx_places_location').using('gist', table.location),
  ],
);

// ─── 8. Rides ─────────────────────────────────────────────────────────────────

export const rides = pgTable(
  'rides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    originLabel: text('origin_label').notNull(),
    originLocation: geographyPoint('origin_location').notNull(),
    originPlaceId: uuid('origin_place_id').references(() => places.id, { onDelete: 'set null' }),
    destLabel: text('dest_label').notNull(),
    destLocation: geographyPoint('dest_location').notNull(),
    destPlaceId: uuid('dest_place_id').references(() => places.id, { onDelete: 'set null' }),
    routePolyline: text('route_polyline'),
    routeGeom: geographyLineString('route_geom'),
    distanceM: integer('distance_m').notNull(),
    durationS: integer('duration_s').notNull(),
    departsAt: timestamp('departs_at', { withTimezone: true }).notNull(),
    journeyType: journeyTypeEnum('journey_type').notNull(),
    seatsTotal: integer('seats_total').notNull(),
    seatsAvailable: integer('seats_available').notNull(),
    contributionPaise: integer('contribution_paise').notNull(),
    costCapPaise: integer('cost_cap_paise').notNull(),
    tollPaise: integer('toll_paise').notNull().default(0),
    audienceScope: audienceScopeEnum('audience_scope').notNull(),
    genderScope: genderScopeEnum('gender_scope').notNull().default('any'),
    status: rideStatusEnum('status').notNull().default('scheduled'),
    returnRideId: uuid('return_ride_id'),
    seriesId: uuid('series_id'),
    notes: text('notes'),
    helmetProvided: boolean('helmet_provided'),
    luggage: text('luggage'),
    version: integer('version').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    isSynthetic: boolean('is_synthetic').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'chk_seats_available',
      sql`seats_available >= 0 AND seats_available <= seats_total`,
    ),
    check(
      'chk_contribution_cap',
      sql`contribution_paise >= 0 AND contribution_paise <= cost_cap_paise`,
    ),
    index('idx_rides_origin_location').using('gist', table.originLocation),
    index('idx_rides_dest_location').using('gist', table.destLocation),
    index('idx_rides_driver').on(table.driverId, table.departsAt),
    index('idx_rides_status_departs').on(table.status, table.departsAt),
  ],
);

// ─── 9. Ride Stops ────────────────────────────────────────────────────────────

export const rideStops = pgTable(
  'ride_stops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id')
      .notNull()
      .references(() => rides.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    label: text('label').notNull(),
    location: geographyPoint('location').notNull(),
    etaOffsetS: integer('eta_offset_s').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_ride_stops_seq').on(table.rideId, table.seq),
  ],
);

// ─── 10. Bookings ─────────────────────────────────────────────────────────────

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id')
      .notNull()
      .references(() => rides.id, { onDelete: 'cascade' }),
    passengerId: uuid('passenger_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    seats: integer('seats').notNull().default(1),
    pickupLabel: text('pickup_label').notNull(),
    pickupLocation: geographyPoint('pickup_location').notNull(),
    dropLabel: text('drop_label').notNull(),
    dropLocation: geographyPoint('drop_location').notNull(),
    status: bookingStatusEnum('status').notNull().default('requested'),
    contributionPaise: integer('contribution_paise').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    cancelKind: cancelKindEnum('cancel_kind'),
    settledByPassengerAt: timestamp('settled_by_passenger_at', { withTimezone: true }),
    settledByDriverAt: timestamp('settled_by_driver_at', { withTimezone: true }),
    settleMethod: settleMethodEnum('settle_method'),
    requestExpiresAt: timestamp('request_expires_at', { withTimezone: true }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    isSynthetic: boolean('is_synthetic').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_booking_seats', sql`seats >= 1`),
    // Active booking unique partial: only 1 active booking per passenger per ride
    uniqueIndex('idx_unique_active_booking')
      .on(table.rideId, table.passengerId)
      .where(sql`status IN ('requested', 'accepted', 'waitlisted')`),
    index('idx_bookings_passenger').on(table.passengerId, table.createdAt),
    index('idx_bookings_ride_status').on(table.rideId, table.status),
  ],
);

// ─── 11. Reviews ──────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revieweeId: uuid('reviewee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    comment: varchar('comment', { length: 500 }),
    status: varchar('status', { length: 20 }).notNull().default('visible'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_review_rating', sql`rating >= 1 AND rating <= 5`),
    uniqueIndex('idx_reviews_booking_reviewer').on(table.bookingId, table.reviewerId),
    index('idx_reviews_reviewee').on(table.revieweeId),
  ],
);

// ─── 12. Blocks ───────────────────────────────────────────────────────────────

export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_blocks_pair').on(table.blockerId, table.blockedId),
  ],
);

// ─── 13. Reports & Events ─────────────────────────────────────────────────────

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rideId: uuid('ride_id').references(() => rides.id, { onDelete: 'set null' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    category: reportCategoryEnum('category').notNull(),
    details: text('details').notNull(),
    status: reportStatusEnum('status').notNull().default('open'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
    severity: reportSeverityEnum('severity').notNull().default('medium'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_reports_status').on(table.status),
    index('idx_reports_severity').on(table.severity),
  ],
);

export const reportEvents = pgTable('report_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── 14. Trusted Contacts ─────────────────────────────────────────────────────

export const trustedContacts = pgTable(
  'trusted_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    phoneE164: varchar('phone_e164', { length: 128 }).notNull(), // App-level encrypted
    relationship: varchar('relationship', { length: 50 }).notNull(),
    notifyEmail: varchar('notify_email', { length: 255 }),
    consentConfirmedAt: timestamp('consent_confirmed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trusted_contacts_user').on(table.userId),
  ],
);

// ─── 15. Trip Shares ──────────────────────────────────────────────────────────

export const tripShares = pgTable(
  'trip_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id')
      .notNull()
      .references(() => rides.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    scope: varchar('scope', { length: 20 }).notNull().default('basic'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trip_shares_ride').on(table.rideId),
  ],
);

// ─── 16. SOS Events ───────────────────────────────────────────────────────────

export const sosEvents = pgTable(
  'sos_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rideId: uuid('ride_id').references(() => rides.id, { onDelete: 'set null' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    location: geographyPoint('location'),
    accuracyM: real('accuracy_m'),
    batteryPct: smallint('battery_pct'),
    status: sosStatusEnum('status').notNull().default('triggered'),
    acknowledgedBy: uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    notified: jsonb('notified').notNull().default({}),
    resolutionNotes: text('resolution_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sos_status').on(table.status),
    index('idx_sos_created').on(table.createdAt),
  ],
);

// ─── 17. Location Pings (R1.1 completeness) ───────────────────────────────────

export const locationPings = pgTable(
  'location_pings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id')
      .notNull()
      .references(() => rides.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    location: geographyPoint('location').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_location_pings_ride').on(table.rideId, table.recordedAt),
  ],
);

// ─── 18. Notifications ────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 50 }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    channelStatus: jsonb('channel_status').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notifications_user').on(table.userId, table.createdAt),
  ],
);

// ─── 19. Push Tokens ──────────────────────────────────────────────────────────

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    platform: varchar('platform', { length: 20 }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_push_tokens_user').on(table.userId),
  ],
);

// ─── 20. Notification Preferences ─────────────────────────────────────────────

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  prefs: jsonb('prefs').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── 21. App Config ───────────────────────────────────────────────────────────

export const appConfig = pgTable('app_config', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── 22. Feature Flags ────────────────────────────────────────────────────────

export const featureFlags = pgTable('feature_flags', {
  key: varchar('key', { length: 100 }).primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
  rolloutPct: integer('rollout_pct').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── 23. Idempotency Keys ─────────────────────────────────────────────────────

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar('key', { length: 128 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    route: varchar('route', { length: 255 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    response: jsonb('response').notNull(),
    statusCode: integer('status_code').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_idempotency_user').on(table.userId),
    index('idx_idempotency_expires').on(table.expiresAt),
  ],
);

// ─── 24. Audit Log (Append-only) ──────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    requestId: varchar('request_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_actor').on(table.actorId),
    index('idx_audit_entity').on(table.entity, table.entityId),
    index('idx_audit_created').on(table.createdAt),
  ],
);

// ─── 25. Search Events (Aggregated demand log, no user_id) ────────────────────

export const searchEvents = pgTable(
  'search_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destPlaceId: uuid('dest_place_id').references(() => places.id, { onDelete: 'set null' }),
    dateBucket: date('date_bucket').notNull(),
    hourBucket: smallint('hour_bucket').notNull(),
    resultsCount: integer('results_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_search_events_bucket').on(table.destPlaceId, table.dateBucket, table.hourBucket),
  ],
);
