-- Practical videos are gated like series (owner decision 2026-09-25).
--
-- DEFAULT true, so every EXISTING video becomes premium the moment this runs.
-- That is deliberate: the owner asked for the whole section to be locked, and
-- opening individual videos is a deliberate click in the panel afterwards.
ALTER TABLE "PracticalVideo" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT true;
