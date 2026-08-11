-- Phone numbers that receive premium without paying (partner group members).
CREATE TABLE "PremiumPhone" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "addedById" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PremiumPhone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PremiumPhone_phone_key" ON "PremiumPhone"("phone");
CREATE INDEX "PremiumPhone_claimedAt_idx" ON "PremiumPhone"("claimedAt");
