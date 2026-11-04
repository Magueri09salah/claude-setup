// The DB stores UTC; the panel shows it on the PC's OWN CLOCK (owner decision
// 2026-11-03). The PC is in Morocco, so that is Moroccan time.
//
// This used to force timeZone "Africa/Casablanca", which trusts the browser's
// built-in timezone rules. Morocco went back to GMT all year on 2026-09-20 and
// rules older than that still add an hour; the PC's own clock is kept right by
// the operating system. (Two datetime-local converters that lived here were
// dropped with them: nothing used them since lives became a daily time.)
export function formatCasablanca(iso: string): string {
  return new Date(iso).toLocaleString("ar-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
