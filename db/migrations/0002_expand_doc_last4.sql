-- Migration 0002: Expand doc_last4 column for AES-256-GCM and allow null doc_key for retention purge (docs/05, D-08)
ALTER TABLE verification_requests ALTER COLUMN doc_last4 TYPE VARCHAR(128);
ALTER TABLE verification_requests ALTER COLUMN doc_key DROP NOT NULL;
