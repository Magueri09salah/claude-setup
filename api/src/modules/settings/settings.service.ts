import type { AppSettings } from "@prisma/client";
import { prisma } from "../../prisma";
import { normalizePhone } from "../premium/phone";

/** The singleton row, created on demand so a fresh DB is never missing it. */
export async function getAppSettings(): Promise<AppSettings> {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export interface SupportInfo {
  /** Ready to use in a wa.me link, digits only, e.g. 212612345678. */
  whatsappNumber: string | null;
  /** Prefix the app puts before the candidate's own details. */
  whatsappMessage: string;
}

const DEFAULT_MESSAGE = "السلام عليكم، أريد فتح المحتوى الكامل في تطبيق طريق.";

/**
 * wa.me wants an international number with no +, spaces or leading zero.
 * Numbers are stored in the canonical Moroccan local form (0XXXXXXXXX), so
 * convert here rather than making the admin type a second format.
 */
export function toWaMeNumber(local: string | null): string | null {
  if (!local) return null;
  const normalized = normalizePhone(local);
  if (!/^0\d{9}$/.test(normalized)) return null;
  return `212${normalized.slice(1)}`;
}

export function toSupportInfo(settings: AppSettings): SupportInfo {
  return {
    whatsappNumber: toWaMeNumber(settings.whatsappNumber),
    whatsappMessage: settings.whatsappMessage?.trim() || DEFAULT_MESSAGE,
  };
}
