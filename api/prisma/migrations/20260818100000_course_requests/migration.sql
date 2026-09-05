-- Course requests: a candidate asks to take driving lessons in a given city.
CREATE TYPE "CourseRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'ENROLLED', 'CANCELLED');

CREATE TABLE "CourseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "status" "CourseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseRequest_userId_city_key" ON "CourseRequest"("userId", "city");
CREATE INDEX "CourseRequest_status_createdAt_idx" ON "CourseRequest"("status", "createdAt");
CREATE INDEX "CourseRequest_city_idx" ON "CourseRequest"("city");

ALTER TABLE "CourseRequest" ADD CONSTRAINT "CourseRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
