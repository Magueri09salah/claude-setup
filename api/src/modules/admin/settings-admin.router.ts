import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { normalizePhone, isValidMoroccanMobile } from "../premium/phone";
import { getAppSettings, toSupportInfo } from "../settings/settings.service";

// App-wide settings. Mounted under the ADMIN role guard.
export const settingsAdminRouter = Router();

// Security checklist: whitelist the type, cap the size, derive the extension
// server-side. A logo is small — it is drawn at 132pt at its largest.
const ALLOWED_LOGO: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1 },
});

// Empty string clears the number; anything else must be a real Moroccan mobile,
// otherwise the wa.me link the app builds would silently go nowhere.
const moroccanMobile = z
  .union([z.literal(""), z.string().trim().max(24)])
  .transform((v) => (v === "" ? null : normalizePhone(v)))
  .refine((v) => v === null || isValidMoroccanMobile(v), {
    message: "رقم هاتف مغربي غير صالح",
  })
  .nullable();

const settingsSchema = z.strictObject({
  whatsappNumber: moroccanMobile.optional(),
  // Cleared (empty string) disables the shop's order button in the app.
  shopWhatsappNumber: moroccanMobile.optional(),
  whatsappMessage: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

settingsAdminRouter.get("/app-settings", async (_req, res) => {
  const settings = await getAppSettings();
  res.json({
    settings,
    preview: toSupportInfo(settings),
    logoUrl: settings.logoKey
      ? await storage.getSignedUrl(settings.logoKey)
      : null,
  });
});

/**
 * Replace the app's logo. Phones pick it up on their next sync and cache it on
 * disk, so it keeps working offline and on the login screen.
 *
 * The key is versioned rather than overwritten, like every other upload here:
 * a phone that already downloaded `branding/logo.png` would otherwise keep
 * showing the old picture from its own cache for ever.
 */
settingsAdminRouter.post(
  "/app-logo",
  logoUpload.single("logo"),
  async (req, res) => {
    const file = req.file;
    if (!file) throw new ApiError(400, "Missing file field 'logo'");
    const ext = ALLOWED_LOGO[file.mimetype];
    if (!ext) throw new ApiError(415, "صيغة غير مدعومة — png / webp / jpg فقط");
    if (file.size > MAX_LOGO_BYTES) {
      throw new ApiError(413, "الصورة كبيرة — 2 ميغا كحد أقصى");
    }

    let key = `branding/logo.${ext}`;
    for (let v = 2; await storage.exists(key); v++) {
      key = `branding/logo_v${v}.${ext}`;
    }
    await storage.put(key, file.buffer, file.mimetype);

    await getAppSettings(); // guarantees the singleton exists
    const settings = await prisma.appSettings.update({
      where: { id: 1 },
      data: { logoKey: key },
    });
    res.json({ settings, logoUrl: await storage.getSignedUrl(key) });
  },
);

/** Back to the logo bundled in the app binary. */
settingsAdminRouter.delete("/app-logo", async (_req, res) => {
  await getAppSettings();
  const settings = await prisma.appSettings.update({
    where: { id: 1 },
    data: { logoKey: null },
  });
  res.json({ settings, logoUrl: null });
});

settingsAdminRouter.put("/app-settings", async (req, res) => {
  const input = settingsSchema.parse(req.body);
  await getAppSettings(); // guarantees the singleton exists
  const settings = await prisma.appSettings.update({
    where: { id: 1 },
    data: input,
  });
  res.json({ settings, preview: toSupportInfo(settings) });
});
