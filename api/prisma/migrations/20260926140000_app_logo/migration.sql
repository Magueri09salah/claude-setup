-- The app logo, replaceable from the admin panel without shipping a new build.
-- Nullable: null means the phone keeps using the picture bundled in the binary.
ALTER TABLE "AppSettings" ADD COLUMN "logoKey" TEXT;
