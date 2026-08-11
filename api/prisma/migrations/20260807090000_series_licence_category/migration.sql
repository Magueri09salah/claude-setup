-- Licence categories: the app now carries separate question sets for moto (A),
-- truck (C) and bus (D) alongside the original car (B) content.
CREATE TYPE "LicenceCategory" AS ENUM ('B', 'A', 'C', 'D');

-- Default B: every existing series is car content, so nothing to backfill.
ALTER TABLE "Series"
  ADD COLUMN "category" "LicenceCategory" NOT NULL DEFAULT 'B';

CREATE INDEX "Series_category_orderNum_idx" ON "Series"("category", "orderNum");
