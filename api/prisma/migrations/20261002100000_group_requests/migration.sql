-- In-app "الانضمام إلى المجموعة" requests (owner decision 2026-10-02).
--
-- iOS cannot show the WhatsApp button (App Store guideline 3.1.1 forbids
-- sending the candidate out of the app to arrange access), so the request has
-- to stay inside the app and land in a table the panel can read. Android keeps
-- the WhatsApp flow and never writes here.
--
-- Additive only: no existing table or column is touched, so this is safe to
-- run against the live database while the current build is in people's hands.

CREATE TYPE "GroupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "GroupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "status" "GroupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupRequest_pkey" PRIMARY KEY ("id")
);

-- UNIQUE, not a plain index: one live request per candidate. Pressing the
-- button again upserts the row back to PENDING rather than duplicating it,
-- which is also how a renewal arrives once the three months have run out.
CREATE UNIQUE INDEX "GroupRequest_userId_key" ON "GroupRequest"("userId");

CREATE INDEX "GroupRequest_status_createdAt_idx" ON "GroupRequest"("status", "createdAt");

ALTER TABLE "GroupRequest" ADD CONSTRAINT "GroupRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
