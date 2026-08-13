import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { normalizePhone, isValidMoroccanMobile } from "../premium/phone";
import { getAppSettings, toSupportInfo } from "../settings/settings.service";

// App-wide settings. Mounted under the ADMIN role guard.
export const settingsAdminRouter = Router();

// Empty string clears the number; anything else must be a real Moroccan mobile,
// otherwise the wa.me link the app builds would silently go nowhere.
const whatsappNumber = z
  .union([z.literal(""), z.string().trim().max(24)])
  .transform((v) => (v === "" ? null : normalizePhone(v)))
  .refine((v) => v === null || isValidMoroccanMobile(v), {
    message: "رقم هاتف مغربي غير صالح",
  })
  .nullable();

const settingsSchema = z.strictObject({
  whatsappNumber: whatsappNumber.optional(),
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
  res.json({ settings, preview: toSupportInfo(settings) });
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
