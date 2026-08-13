-- الشق التطبيقي: a flat list of practical-driving videos, shown from the app's
-- home screen. Streamed like lesson videos, never part of the offline bundle.
CREATE TABLE "PracticalVideo" (
    "id" SERIAL NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "videoKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticalVideo_orderNum_idx" ON "PracticalVideo"("orderNum");
