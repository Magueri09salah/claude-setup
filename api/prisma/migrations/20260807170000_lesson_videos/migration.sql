-- Video lessons (المركبة): a lesson is either a sign grid or a list of videos.
CREATE TYPE "LessonKind" AS ENUM ('SIGNS', 'VIDEOS');

-- Default SIGNS: every lesson that already exists is a sign grid.
ALTER TABLE "Lesson" ADD COLUMN "kind" "LessonKind" NOT NULL DEFAULT 'SIGNS';

CREATE TABLE "LessonVideo" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "videoKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,

    CONSTRAINT "LessonVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LessonVideo_lessonId_orderNum_idx" ON "LessonVideo"("lessonId", "orderNum");

ALTER TABLE "LessonVideo" ADD CONSTRAINT "LessonVideo_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
