-- Candidates now sign in with PHONE + password, and register with a username
-- instead of an email + full name.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Existing accounts keep working: their email doubles as their username, which
-- is already unique, so nobody is locked out and no handle collides.
UPDATE "User" SET "username" = "email" WHERE "username" IS NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Email is no longer collected at registration.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
