-- ==============================================================================
-- CampusRide Database Migration: 0000_init_schema.sql
-- PostgreSQL 16 + PostGIS 3.4
-- ==============================================================================

-- ── 1. Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── 2. Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE member_type AS ENUM ('student', 'staff', 'community');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('member', 'admin', 'safety_admin', 'analyst');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('female', 'male', 'non_binary', 'undisclosed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('car', 'bike', 'scooter', 'auto', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE place_kind AS ENUM ('hub', 'campus', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE journey_type AS ENUM ('local', 'outstation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audience_scope AS ENUM ('campus_only', 'campus_and_community');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_scope AS ENUM ('any', 'women_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ride_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'requested',
    'accepted',
    'rejected',
    'cancelled_by_passenger',
    'cancelled_by_driver',
    'expired',
    'waitlisted',
    'completed',
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cancel_kind AS ENUM ('normal', 'uncomfortable', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_kind AS ENUM (
    'college_id',
    'govt_id',
    'selfie',
    'driving_licence',
    'vehicle_rc',
    'insurance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_category AS ENUM (
    'harassment',
    'unsafe_driving',
    'no_show',
    'fake_profile',
    'vehicle_mismatch',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'triaged', 'action_taken', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sos_status AS ENUM ('triggered', 'acknowledged', 'resolved', 'false_alarm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_kind AS ENUM ('tos', 'privacy', 'location', 'sos_contact_notice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE settle_method AS ENUM ('cash', 'upi', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Tables ─────────────────────────────────────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  email_verified_at TIMESTAMPTZ,
  phone_e164 VARCHAR(20) UNIQUE,
  phone_verified_at TIMESTAMPTZ,
  full_name VARCHAR(150) NOT NULL,
  photo_key VARCHAR(255),
  member_type member_type NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  status user_status NOT NULL DEFAULT 'active',
  gender gender NOT NULL DEFAULT 'undisclosed',
  gender_verified_at TIMESTAMPTZ,
  college_verified_at TIMESTAMPTZ,
  department VARCHAR(100),
  academic_year VARCHAR(20),
  adult_confirmed_at TIMESTAMPTZ NOT NULL,
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  last_active_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Consents
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind consent_kind NOT NULL,
  version VARCHAR(50) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id, kind);

-- Auth OTP Challenges
CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  code_hmac VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email_created ON auth_otp_challenges(email, created_at DESC);

-- Auth Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  refresh_hash VARCHAR(128) UNIQUE NOT NULL,
  user_agent TEXT,
  ip_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family ON auth_sessions(family_id);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type vehicle_type NOT NULL,
  make_model VARCHAR(100) NOT NULL,
  colour VARCHAR(50) NOT NULL,
  registration_number VARCHAR(30) NOT NULL,
  passenger_capacity INTEGER NOT NULL,
  insurance_valid_until TIMESTAMPTZ NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'pending',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_vehicle_capacity CHECK (
    passenger_capacity >= 1 AND passenger_capacity <= 6 AND
    (type NOT IN ('bike', 'scooter') OR passenger_capacity = 1)
  )
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_reg_active ON vehicles(registration_number) WHERE deleted_at IS NULL;

-- Verification Requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind verification_kind NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  doc_key VARCHAR(255) NOT NULL,
  doc_last4 VARCHAR(4),
  status verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  expires_on TIMESTAMPTZ,
  purge_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_status ON verification_requests(status);

-- Places
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  kind place_kind NOT NULL,
  city VARCHAR(100) NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  address TEXT NOT NULL,
  google_place_id VARCHAR(255) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_kind ON places(kind);
CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);

-- Rides
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  origin_label TEXT NOT NULL,
  origin_location GEOGRAPHY(Point, 4326) NOT NULL,
  origin_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  dest_label TEXT NOT NULL,
  dest_location GEOGRAPHY(Point, 4326) NOT NULL,
  dest_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  route_polyline TEXT,
  route_geom GEOGRAPHY(LineString, 4326),
  distance_m INTEGER NOT NULL,
  duration_s INTEGER NOT NULL,
  departs_at TIMESTAMPTZ NOT NULL,
  journey_type journey_type NOT NULL,
  seats_total INTEGER NOT NULL,
  seats_available INTEGER NOT NULL,
  contribution_paise INTEGER NOT NULL,
  cost_cap_paise INTEGER NOT NULL,
  toll_paise INTEGER NOT NULL DEFAULT 0,
  audience_scope audience_scope NOT NULL,
  gender_scope gender_scope NOT NULL DEFAULT 'any',
  status ride_status NOT NULL DEFAULT 'scheduled',
  return_ride_id UUID,
  series_id UUID,
  notes TEXT,
  helmet_provided BOOLEAN,
  luggage TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_seats_available CHECK (seats_available >= 0 AND seats_available <= seats_total),
  CONSTRAINT chk_contribution_cap CHECK (contribution_paise >= 0 AND contribution_paise <= cost_cap_paise),
  CONSTRAINT chk_departs_future CHECK (departs_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_rides_origin_location ON rides USING GIST(origin_location);
CREATE INDEX IF NOT EXISTS idx_rides_dest_location ON rides USING GIST(dest_location);
CREATE INDEX IF NOT EXISTS idx_rides_route_geom ON rides USING GIST(route_geom);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id, departs_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status_departs ON rides(status, departs_at);

-- Ride Stops
CREATE TABLE IF NOT EXISTS ride_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  label TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  eta_offset_s INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ride_stops_seq UNIQUE (ride_id, seq)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats INTEGER NOT NULL DEFAULT 1,
  pickup_label TEXT NOT NULL,
  pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
  drop_label TEXT NOT NULL,
  drop_location GEOGRAPHY(Point, 4326) NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  contribution_paise INTEGER NOT NULL,
  decided_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancel_kind cancel_kind,
  settled_by_passenger_at TIMESTAMPTZ,
  settled_by_driver_at TIMESTAMPTZ,
  settle_method settle_method,
  request_expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key VARCHAR(128),
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_seats CHECK (seats >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking
  ON bookings(ride_id, passenger_id)
  WHERE status IN ('requested', 'accepted', 'waitlisted');

CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_ride_status ON bookings(ride_id, status);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  comment VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT uq_reviews_booking_reviewer UNIQUE (booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_blocks_pair UNIQUE (blocker_id, blocked_id)
);

-- Reports & Events
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  category report_category NOT NULL,
  details TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  severity report_severity NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON reports(severity);

CREATE TABLE IF NOT EXISTS report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trusted Contacts
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone_e164 VARCHAR(128) NOT NULL, -- App-level encrypted
  relationship VARCHAR(50) NOT NULL,
  notify_email VARCHAR(255),
  consent_confirmed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);

-- Trip Shares
CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  scope VARCHAR(20) NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_shares_ride ON trip_shares(ride_id);

-- SOS Events
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  location GEOGRAPHY(Point, 4326),
  accuracy_m REAL,
  battery_pct SMALLINT,
  status sos_status NOT NULL DEFAULT 'triggered',
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notified JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_events(status);
CREATE INDEX IF NOT EXISTS idx_sos_created ON sos_events(created_at);

-- Location Pings (R1.1)
CREATE TABLE IF NOT EXISTS location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_pings_ride ON location_pings(ride_id, recorded_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  channel_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Push Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  platform VARCHAR(20) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- Notification Prefs
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Config
CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  rollout_pct INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(128) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route VARCHAR(255) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response JSONB NOT NULL,
  status_code INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Audit Log (Append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  ip_hash VARCHAR(64) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Search Events (Aggregated demand log, no user_id)
CREATE TABLE IF NOT EXISTS search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dest_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  date_bucket DATE NOT NULL,
  hour_bucket SMALLINT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_events_bucket ON search_events(dest_place_id, date_bucket, hour_bucket);

-- ── 4. Immutability Triggers ───────────────────────────────────────────────────

-- Audit Log: Rejects UPDATE and DELETE
CREATE OR REPLACE FUNCTION trg_audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update_or_delete ON audit_log;
CREATE TRIGGER audit_log_no_update_or_delete
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION trg_audit_log_immutable();

-- SOS Events: Rejects DELETE and immutable field modifications
CREATE OR REPLACE FUNCTION trg_sos_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'sos_events cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id != NEW.id OR
       OLD.user_id != NEW.user_id OR
       OLD.ride_id IS DISTINCT FROM NEW.ride_id OR
       OLD.booking_id IS DISTINCT FROM NEW.booking_id OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'Core fields of sos_events are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sos_events_immutability ON sos_events;
CREATE TRIGGER sos_events_immutability
BEFORE UPDATE OR DELETE ON sos_events
FOR EACH ROW
EXECUTE FUNCTION trg_sos_events_immutable();
