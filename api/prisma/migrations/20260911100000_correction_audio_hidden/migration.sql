-- Hide only the correction's voice-over, keeping its written text visible.
ALTER TABLE "Question" ADD COLUMN "correctionAudioHidden" BOOLEAN NOT NULL DEFAULT false;
