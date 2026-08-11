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

  // The countdown reaching zero means the live just started — only the server
  // knows the new window, so refetch instead of guessing.
  const passed =
    settings !== null && new Date(settings.nextStartAt).getTime() <= now;
  useEffect(() => {
    if (passed) fetchNow(true);
  }, [passed, fetchNow]);

  const currentKey = settings ? occurrenceKey(settings) : null;

  return {
    settings,
    badge: currentKey !== null && currentKey !== seen ? 1 : 0,
    currentKey,
    countdown: settings ? countdownTo(settings.nextStartAt, now) : null,
    reload: () => fetchNow(true),
  };
}
