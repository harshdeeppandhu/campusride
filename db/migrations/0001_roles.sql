-- ==============================================================================
-- CampusRide Database Migration: 0001_roles.sql
-- Principle of Least Privilege Database Roles (docs/05 §4 & docs/03 §5)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw WITH LOGIN PASSWORD 'app_rw_dev_password';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
    CREATE ROLE migrator WITH LOGIN PASSWORD 'migrator_dev_password';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_ro') THEN
    CREATE ROLE analytics_ro WITH LOGIN PASSWORD 'analytics_ro_dev_password';
  END IF;
END
$$;

-- Schema usage
GRANT USAGE ON SCHEMA public TO app_rw;
GRANT ALL ON SCHEMA public TO migrator;

-- Table permissions for app_rw
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rw;

-- Enforce append-only on audit_log for app_rw role at DB level
REVOKE UPDATE, DELETE ON audit_log FROM app_rw;

-- Analytics role (analytics_ro) will have SELECT on analytics schema (created in M11)
GRANT USAGE ON SCHEMA public TO analytics_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_ro;
