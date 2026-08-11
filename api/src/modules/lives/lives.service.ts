import type { LiveSettings } from "@prisma/client";
import { prisma } from "../../prisma";
import { allPushTokens, sendPush } from "./push";
import { liveWindow } from "./schedule";

export const PLATFORMS = [
  "YOUTUBE",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
] as const;
export type PlatformKey = (typeof PLATFORMS)[number];

const URL_FIELD = {
  YOUTUBE: "youtubeUrl",
  FACEBOOK: "facebookUrl",
  INSTAGRAM: "instagramUrl",
  TIKTOK: "tiktokUrl",
} as const satisfies Record<PlatformKey, keyof LiveSettings>;

/** The singleton row, created on demand so a fresh DB is never missing it. */
export async function getLiveSettings(): Promise<LiveSettings> {
  return prisma.liveSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export interface PublicLive {
  enabled: boolean;
  startTime: string;
  platforms: { platform: PlatformKey; url: string }[];
  nextStartAt: string;
  isLive: boolean;
  startsSoon: boolean;
}

/** Shape sent to the app: only the platforms the owner actually filled in. */
export function toPublicLive(s: LiveSettings, now = new Date()): PublicLive {
  const w = liveWindow(s.startTime, now);
  const platforms = PLATFORMS.flatMap((platform) => {
    const url = s[URL_FIELD[platform]];
    return url ? [{ platform, url }] : [];
  });
  return {
    enabled: s.enabled && platforms.length > 0,
    startTime: s.startTime,
    platforms,
    nextStartAt: w.nextStartAt.toISOString(),
    isLive: s.enabled && w.isLive,
    startsSoon: s.enabled && w.startsSoon,
  };
}

export type PushKind = "reminder" | "started";

/** Broadcasts the daily live push and records the reach on the singleton. */
export async function pushForLive(kind: PushKind): Promise<number> {
  const tokens = await allPushTokens();
  const reach = await sendPush(tokens, {
    title: kind === "reminder" ? "بث مباشر قريباً" : "بدأ البث المباشر",
    body:
      kind === "reminder"
        ? "البث المباشر يبدأ بعد 15 دقيقة — اختر المنصة"
        : "البث المباشر بدأ الآن — اضغط لاختيار المنصة",
    // Any live push routes to the lives screen, where the viewer picks a
    // platform — there is no single url to deep-link to.
    data: { type: "live" },
  });
  await prisma.liveSettings.update({
    where: { id: 1 },
    data: { lastPushReach: reach },
  });
  return reach;
}
