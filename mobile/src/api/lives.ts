import { api } from "./client";

export type LivePlatform = "YOUTUBE" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

export interface LivePlatformLink {
  platform: LivePlatform;
  url: string;
}

// The live is a standing daily appointment on fixed profiles, so there is no
// event list — just where it happens and when the next one starts.
export interface LiveSettings {
  enabled: boolean;
  /** "HH:mm" Moroccan wall-clock — read on the phone's own clock (useLive). */
  startTime: string;
  platforms: LivePlatformLink[];
  /**
   * UTC ISO of the next occurrence. These three come from the server, but
   * useLive replaces them with values worked out on the phone's clock.
   */
  nextStartAt: string;
  isLive: boolean;
  startsSoon: boolean;
}

export function getLiveSettings() {
  return api<LiveSettings>("/lives/settings");
}
