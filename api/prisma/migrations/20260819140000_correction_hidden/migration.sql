-- Per-question switch: hide the correction from candidates without deleting it.
ALTER TABLE "Question" ADD COLUMN "correctionHidden" BOOLEAN NOT NULL DEFAULT false;
