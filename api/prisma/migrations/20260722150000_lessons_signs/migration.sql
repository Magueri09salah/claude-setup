-- DropForeignKey
ALTER TABLE "LessonBlock" DROP CONSTRAINT "LessonBlock_lessonId_fkey";

-- DropTable
DROP TABLE "LessonBlock";

-- DropEnum
DROP TYPE "BlockType";

-- CreateTable
CREATE TABLE "LessonSign" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "audioKey" TEXT,

    CONSTRAINT "LessonSign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonSign_lessonId_idx" ON "LessonSign"("lessonId");

-- AddForeignKey
ALTER TABLE "LessonSign" ADD CONSTRAINT "LessonSign_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
