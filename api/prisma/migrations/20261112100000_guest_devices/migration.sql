-- Guest mode: push tokens of phones used without an account (additive only).
CREATE TABLE "GuestDevice" (
    "pushToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestDevice_pkey" PRIMARY KEY ("pushToken")
);
