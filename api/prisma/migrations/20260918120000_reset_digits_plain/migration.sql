-- The three password-reset digits kept readable, so the owner can tell a
-- candidate who forgot them. cinLast3Hash stays and remains the only thing the
-- reset flow checks against; this column is for display in the admin panel.
--
-- Nullable with no backfill on purpose: existing rows hold only a bcrypt hash,
-- which cannot be reversed. Those accounts will read "not available" until the
-- candidate registers again or the owner sets the digits by hand.
ALTER TABLE "User" ADD COLUMN "resetDigits" TEXT;
