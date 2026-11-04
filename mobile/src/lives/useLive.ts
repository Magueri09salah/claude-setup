import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { getLiveSettings, type LiveSettings } from "../api/lives";
import { getMeta, setMeta } from "../db";

// Shared across the header bell and the home section so one screen = one fetch.
let cache: LiveSettings | null = null;
let inflight: Promise<LiveSettings> | null = null;

const CACHE_KEY = "live_settings";
const SEEN_KEY = "live_seen_occurrence";

function readCache(): LiveSettings | null {
  if (cache) return cache;
  try {
    const raw = getMeta(CACHE_KEY);
    cache = raw ? (JSON.parse(raw) as LiveSettings) : null;
  } catch {
    cache = null;
  }
  return cache;
}

async function load(force: boolean): Promise<LiveSettings> {
  if (!force && cache) return cache;
  inflight ??= getLiveSettings()
    .then((data) => {
      cache = data;
      setMeta(CACHE_KEY, JSON.stringify(data));
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Local calendar day — the phone is in Morocco, so this is Casablanca's day. */
function localDay(at = new Date()): string {
  return `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}`;
}

// One occurrence = one thing to notice. While on air that is "today's live";
// before it, the upcoming start. Storing the key (not a count) means the badge
// clears on open and comes back by itself for tomorrow's live.
function occurrenceKey(s: LiveSettings): string | null {
  if (s.isLive) return `live:${localDay()}`;
  if (s.startsSoon) return `soon:${s.nextStartAt}`;
  return null;
}

export function markLiveSeen(key: string): void {
  setMeta(SEEN_KEY, key);
}

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  /** 0→1 share of the 24h cycle still to wait — drives the ring. */
  remainingFraction: number;
  totalMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirror SOON_WINDOW_MIN / LIVE_WINDOW_MIN in api/src/modules/lives/schedule.ts.
const SOON_WINDOW_MIN = 15;
const LIVE_WINDOW_MIN = 60;

/**
 * The live's timing read off the PHONE'S OWN CLOCK (owner decision 2026-11-03):
 * "20:00" in the panel means 20:00 on the phone, full stop.
 *
 * The server used to send the next start as a UTC instant computed with its
 * own timezone rules, and those were a year out of date: Morocco went back to
 * GMT on 2026-09-20 while the server still added an hour, so the countdown ran
 * out at 19:00 under a label that said 20:00. Computing it here makes the label
 * and the countdown agree by construction, whatever the phone's clock is set
 * to — including a phone whose own timezone data is stale and whose owner
 * simply set the time by hand.
 *
 * Accepted trade-off: a phone outside Morocco counts down to 20:00 on ITS
 * clock, not Morocco's. The audience is Moroccan candidates.
 */
function onPhoneClock(s: LiveSettings, now: number): LiveSettings {
  const m = /^(\d{2}):(\d{2})$/.exec(s.startTime);
  if (!m) return s; // malformed: keep whatever the server worked out
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const today = new Date(now);
  // By CALENDAR day, never ±24h, so 20:00 stays 20:00 across a clock change.
  // Yesterday's counts: a 23:30 live is still on air after midnight.
  const starts = [-1, 0, 1, 2].map((offset) =>
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
      hh,
      mm,
    ).getTime(),
  );
  const onAir = starts.some(
    (t) => now >= t && now < t + LIVE_WINDOW_MIN * 60_000,
  );
  const next = starts.find((t) => t > now) ?? now + DAY_MS;
  return {
    ...s,
    nextStartAt: new Date(next).toISOString(),
    isLive: s.enabled && onAir,
    startsSoon: s.enabled && next - now <= SOON_WINDOW_MIN * 60_000,
  };
}

export function countdownTo(iso: string, now: number): Countdown {
  const ms = Math.max(0, new Date(iso).getTime() - now);
  return {
    hours: Math.floor(ms / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    // The live repeats daily, so a full ring is one day of waiting.
    remainingFraction: Math.min(1, ms / DAY_MS),
    totalMs: ms,
  };
}

export interface UseLive {
  settings: LiveSettings | null;
  /** 1 while there is an unseen imminent/on-air live, else 0. */
  badge: number;
  /** Key to pass to markLiveSeen when the user opens the lives view. */
  currentKey: string | null;
  countdown: Countdown | null;
  reload: () => void;
}

export function useLive(tick = true): UseLive {
  const [settings, setSettings] = useState<LiveSettings | null>(readCache);
  const [seen, setSeen] = useState<string | null>(() => getMeta(SEEN_KEY));
  const [now, setNow] = useState(() => Date.now());

  const fetchNow = useCallback((force: boolean) => {
    load(force)
      .then(setSettings)
      .catch(() => undefined); // offline: keep the cached settings
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNow(true);
      setSeen(getMeta(SEEN_KEY)); // re-read after the lives view marked it
    }, [fetchNow]),
  );

  useEffect(() => {
    if (!tick) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tick]);

  // Recomputed every tick from the phone's clock, so the next start is always
  // in the future and the countdown rolls over to tomorrow by itself — no
  // refetch when it reaches zero.
  const live = settings ? onPhoneClock(settings, now) : null;
  const currentKey = live ? occurrenceKey(live) : null;

  return {
    settings: live,
    badge: currentKey !== null && currentKey !== seen ? 1 : 0,
    currentKey,
    countdown: live ? countdownTo(live.nextStartAt, now) : null,
    reload: () => fetchNow(true),
  };
}
