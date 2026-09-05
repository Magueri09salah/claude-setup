-- Move reset throttling off the User row and onto the PHONE.
-- Two reasons: an unknown number could not be counted at all (which leaked
-- which numbers are registered), and the read-compare-write on User raced —
-- concurrent requests each read the same counter and got far more than 3 tries.
CREATE TABLE "PasswordResetAttempt" (
    "phone" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetAttempt_pkey" PRIMARY KEY ("phone")
);

-- Single-use marker so a reset token cannot be replayed within its 10min TTL.
ALTER TABLE "User" ADD COLUMN "pwResetNonce" TEXT;

ALTER TABLE "User" DROP COLUMN "resetAttempts";
ALTER TABLE "User" DROP COLUMN "resetLockedUntil";
