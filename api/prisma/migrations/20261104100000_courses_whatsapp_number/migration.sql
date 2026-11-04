-- Separate WhatsApp number for course requests (التسجيل في الدروس).
-- Nullable on purpose: null means "use whatsappNumber", which is where these
-- requests went until now, so existing rows keep working unchanged.
ALTER TABLE "AppSettings" ADD COLUMN "coursesWhatsappNumber" TEXT;
