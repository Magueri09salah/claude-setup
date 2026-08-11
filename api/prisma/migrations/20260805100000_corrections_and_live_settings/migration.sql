-- Question corrections: explanation text + optional voice-over, shown only in
-- the end-of-quiz review.
ALTER TABLE "Question" ADD COLUMN "correctionText" TEXT;
ALTER TABLE "Question" ADD COLUMN "correctionAudioKey" TEXT;

-- Lives reworked: the owner streams daily at a fixed time on four fixed
-- profiles, so per-event rows are replaced by a settings singleton.
DROP TABLE IF EXISTS "LiveEvent";
DROP TYPE IF EXISTS "LiveStatus";
DROP TYPE IF EXISTS "Platform";

CREATE TABLE "LiveSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "youtubeUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "startTime" TEXT NOT NULL DEFAULT '23:00',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderOn" TEXT,
    "lastStartOn" TEXT,
    "lastPushReach" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton so the admin form always has a row to edit.
INSERT INTO "LiveSettings" ("id", "updatedAt") VALUES (1, NOW());
