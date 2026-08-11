// The DB stores UTC; admins think in Africa/Casablanca. These helpers convert
// between a `datetime-local` input value (wall-clock in Casablanca) and UTC ISO.
const TZ = "Africa/Casablanca";

// Offset (minutes) of Casablanca from UTC at a given instant (handles DST).
function tzOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(at).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - at.getTime()) / 60000;
}

// "2026-07-28T21:30" (Casablanca wall clock) → UTC ISO string.
export function casablancaLocalToUtcIso(local: string): string {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Apply the offset that is in effect at that moment (two-pass for DST edges).
  const off1 = tzOffsetMinutes(new Date(guess));
  const off2 = tzOffsetMinutes(new Date(guess - off1 * 60000));
  return new Date(guess - off2 * 60000).toISOString();
}

// UTC ISO → "2026-07-28T21:30" for a datetime-local input.
export function utcIsoToCasablancaLocal(iso: string): string {
  const at = new Date(iso);
  const shifted = new Date(at.getTime() + tzOffsetMinutes(at) * 60000);
  return shifted.toISOString().slice(0, 16);
}

// Human label in Casablanca time.
export function formatCasablanca(iso: string): string {
  return new Date(iso).toLocaleString("ar-MA", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
