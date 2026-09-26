-- Several pictures per product (owner request 2026-09-26).
--
-- The single Product.imageKey column becomes a ProductImage row so a product
-- can carry a gallery. Existing pictures are carried over as orderNum 1 BEFORE
-- the column is dropped, so no product loses the picture it already had.

CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImage_productId_orderNum_idx" ON "ProductImage"("productId", "orderNum");

ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every existing picture over first.
INSERT INTO "ProductImage" ("productId", "key", "orderNum")
SELECT "id", "imageKey", 1 FROM "Product" WHERE "imageKey" IS NOT NULL;

ALTER TABLE "Product" DROP COLUMN "imageKey";
