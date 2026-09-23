-- Shop orders can go to a different phone than access requests.
-- Nullable on purpose: null means "use whatsappNumber", so existing rows keep
-- working with no backfill.
ALTER TABLE "AppSettings" ADD COLUMN "shopWhatsappNumber" TEXT;
