-- Password reset authorised by the last 3 digits of the national ID card.
-- The digits are hashed; the attempt counter + 24h lockout is what makes a
-- 1000-combination secret usable at all.
ALTER TABLE "User" ADD COLUMN "cinLast3Hash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "resetLockedUntil" TIMESTAMP(3);
