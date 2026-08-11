// The live is a DAILY, recurring, wall-clock event ("every night at 23:00 in
// Morocco"), not a stored timestamp. So every computation here starts from a
// local time in Africa/Casablanca and converts to a UTC instant — never the
// other way round. Morocco shifts offset during Ramadan, so a fixed +01:00
// would silently drift; we ask Intl for the real offset instead.

export const TZ = "Africa/Casablanca";

/** Minutes before the start when the reminder push goes out. */
export const REMIND_BEFORE_MIN = 15;
// How long after the start the live is still considered on-air. Owner decision
// (2026-08-05): one hour — a 23:00 live is over by 00:00, and from then the app
// shows the countdown to the next night again.
export const LIVE_WINDOW_MIN = 60;

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zoneParts(date: Date): {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
  ss: number;
} {
  const out: Record<string, number> = {};
  for (const p of parts.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    y: out.year ?? 0,
    m: out.month ?? 0,
    d: out.day ?? 0,
    // Intl can emit hour 24 for midnight under hour12:false.
    hh: (out.hour ?? 0) % 24,
    mm: out.minute ?? 0,
    ss: out.second ?? 0,
  };
}

/** Offset of the zone at a given instant, in ms (positive = ahead of UTC). */
function offsetMs(date: Date): number {
  const p = zoneParts(date);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - date.getTime();
}

/** Calendar day in Casablanca, "YYYY-MM-DD" — the idempotency key for pushes. */
export function zoneDayKey(date: Date): string {
  const p = zoneParts(date);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** UTC instant for a wall-clock time on a given Casablanca calendar day. */
function zonedToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
): Date {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes: the first offset is read at the wrong instant if the guess
  // lands across a DST change, the second settles it.
  const pass1 = new Date(naive - offsetMs(new Date(naive)));
  return new Date(naive - offsetMs(pass1));
}

export function parseStartTime(startTime: string): { hh: number; mm: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!m) return { hh: 23, mm: 0 };
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

/** The occurrence of `startTime` on the Casablanca day containing `now`. */
export function todayStartAt(startTime: string, now: Date): Date {
  const { hh, mm } = parseStartTime(startTime);
  const p = zoneParts(now);
  return zonedToUtc(p.y, p.m, p.d, hh, mm);
}

// Occurrences for yesterday / today / tomorrow, local-calendar-shifted (never
// ±24h arithmetic, so the hour survives a DST change). Yesterday's matters: a
// 23:00 live is still on air after local midnight, when "today" has already
// rolled over to the next date.
function occurrences(startTime: string, now: Date): Date[] {
  const { hh, mm } = parseStartTime(startTime);
  return [-1, 0, 1].map((offset) => {
    const p = zoneParts(new Date(now.getTime() + offset * 24 * 60 * 60_000));
    return zonedToUtc(p.y, p.m, p.d, hh, mm);
  });
}

export interface LiveWindow {
  /** Start of the occurrence for the current local day. */
  todayAt: Date;
  /** The occurrence currently on air, if any. */
  liveSince: Date | null;
  /** Next occurrence strictly in the future. */
  nextStartAt: Date;
  /** On air: within [start, start + LIVE_WINDOW_MIN]. */
  isLive: boolean;
  /** Imminent: within the reminder window before the start. */
  startsSoon: boolean;
}

export function liveWindow(startTime: string, now: Date): LiveWindow {
  const candidates = occurrences(startTime, now);
  const windowMs = LIVE_WINDOW_MIN * 60_000;

  const liveSince =
    candidates.find(
      (start) =>
        now.getTime() >= start.getTime() &&
        // End exclusive: a 23:00 live is done AT 00:00, not a moment after.
        now.getTime() < start.getTime() + windowMs,
    ) ?? null;

  // Sorted ascending by construction, so the first future one is the next.
  const nextStartAt =
    candidates.find((start) => start.getTime() > now.getTime()) ??
    candidates[candidates.length - 1]!;

  const startsSoon =
    nextStartAt.getTime() - now.getTime() <= REMIND_BEFORE_MIN * 60_000;

  return {
    todayAt: todayStartAt(startTime, now),
    liveSince,
    nextStartAt,
    isLive: liveSince !== null,
    startsSoon,
  };
}
