-- 0002: session revocation without a session table (ADR 0010).
-- Signing out moves this forward; session tokens issued before it stop working.
ALTER TABLE users ADD COLUMN sessions_valid_after timestamptz;
