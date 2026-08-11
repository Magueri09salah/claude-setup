import cron from "node-cron";
import { prisma } from "../../prisma";
import { getLiveSettings, pushForLive, toPublicLive } from "./lives.service";
import { REMIND_BEFORE_MIN, todayStartAt, zoneDayKey } from "./schedule";

// How late a missed tick may still fire the "started" push. Beyond this the
// live is well under way and a notification would only annoy.
const START_GRACE_MIN = 10;

// The live recurs daily at a fixed local time, so there is no row per
// occurrence to mark as notified. Instead each push records the Casablanca
// calendar day it fired on — that day key is the idempotency guard, and it
// also makes a restarted server pick up exactly where it left off.
async function runLiveNotifications(): Promise<void> {
  const settings = await getLiveSettings();
  const pub = toPublicLive(settings);
  if (!pub.enabled) return;

  const now = new Date();
  const startAt = todayStartAt(settings.startTime, now);
  const day = zoneDayKey(startAt);
  const minutesToStart = (startAt.getTime() - now.getTime()) / 60_000;

  if (
    minutesToStart > 0 &&
    minutesToStart <= REMIND_BEFORE_MIN &&
    settings.lastReminderOn !== day
  ) {
    const reach = await pushForLive("reminder");
    await prisma.liveSettings.update({
      where: { id: 1 },
      data: { lastReminderOn: day },
    });
    console.log(`[cron] live reminder sent for ${day} (reach ${reach})`);
    return; // never send both pushes in the same tick
  }

  if (
    minutesToStart <= 0 &&
    minutesToStart >= -START_GRACE_MIN &&
    settings.lastStartOn !== day
  ) {
    const reach = await pushForLive("started");
    await prisma.liveSettings.update({
      where: { id: 1 },
      data: { lastStartOn: day },
    });
    console.log(`[cron] live-started sent for ${day} (reach ${reach})`);
  }
}

// Expire PENDING Wafacash codes past their 72h window.
async function expireStalePayments(): Promise<void> {
  const r = await prisma.payment.updateMany({
    where: {
      status: "PENDING",
      method: "WAFACASH",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  if (r.count > 0) console.log(`[cron] expired ${r.count} stale Wafacash code(s)`);
}

let running = false;

export function startCron(): void {
  cron.schedule("* * * * *", async () => {
    if (running) return; // never overlap ticks
    running = true;
    try {
      await runLiveNotifications();
      await expireStalePayments();
    } catch (err) {
      console.error("[cron] tick failed", err);
    } finally {
      running = false;
    }
  });
  console.log(
    "[cron] scheduled — every minute (daily live T-15/T-0, expire payments)",
  );
}
