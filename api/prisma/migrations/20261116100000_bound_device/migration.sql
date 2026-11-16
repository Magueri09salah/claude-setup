-- First phone wins (owner decision 2026-11-16).
--
-- Holds the sha256 of the phone id a candidate account is tied to. The first
-- login (or registration) from an app that sends the id claims it; every other
-- phone is refused from then on.
--
-- Additive only, and NULL for every existing account: the deploy ties nobody
-- and refuses nobody. Each account is tied by the first request that carries a
-- phone id — the refresh of an already signed-in phone counts, so the phone
-- holding the account when the update arrives is the one that keeps it.

ALTER TABLE "User" ADD COLUMN "boundDeviceId" TEXT;
