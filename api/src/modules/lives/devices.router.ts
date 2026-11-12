import { Expo } from "expo-server-sdk";
import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth } from "../../middleware/auth";
import { guestWriteRateLimit } from "../../middleware/rate-limit";
import { prisma } from "../../prisma";

export const devicesRouter = Router();

const MAX_DEVICES = 2;

// "Is this phone still the one signed in?" The app asks on launch and when it
// comes back to the foreground, because it otherwise works offline and could
// go a long time without a request that would notice. requireAuth does all
// the work (see modules/auth/session.ts). Lives here rather than under /auth
// so it never spends the /auth/* per-IP budget a whole school Wi-Fi shares.
devicesRouter.get("/session", requireAuth, (_req, res) => {
  res.status(204).end();
});

const pushTokenSchema = z.strictObject({
  deviceId: z.string().min(1).max(200),
  pushToken: z.string().max(300).nullable().optional(),
});

// Register/refresh this phone's Expo push token. The token is OPTIONAL-AUTH
// since guest mode (2026-11-12): the daily live push goes to everyone, so a
// phone used without an account registers too — into GuestDevice, see the
// schema. Same body either way, so the app has one call for both.
devicesRouter.post(
  "/push-token",
  optionalAuth,
  guestWriteRateLimit,
  async (req, res) => {
    const input = pushTokenSchema.parse(req.body);

    if (!req.auth) {
      // A guest's "unregister" (null) has nothing to point at — the row is keyed
      // by the token itself — so it is a no-op. Only a real Expo token is
      // stored: anything else could never be delivered and would only grow
      // the table.
      const token = input.pushToken;
      if (token && Expo.isExpoPushToken(token)) {
        await prisma.guestDevice.upsert({
          where: { pushToken: token },
          update: { lastSeenAt: new Date() },
          create: { pushToken: token },
        });
      }
      res.json({ ok: true });
      return;
    }

    const userId = req.auth.userId;

    // Security: max 2 devices per account — the oldest is evicted when a third
    // appears.
    await prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId: input.deviceId } },
      update: { pushToken: input.pushToken ?? null, lastSeenAt: new Date() },
      create: {
        userId,
        deviceId: input.deviceId,
        pushToken: input.pushToken ?? null,
        lastSeenAt: new Date(),
      },
    });
    // The phone was a guest until this sign-in. Its token now lives on the
    // account row, so drop the anonymous copy (sendPush de-duplicates tokens,
    // but the guest count should not keep counting a signed-in phone).
    if (input.pushToken) {
      await prisma.guestDevice.deleteMany({
        where: { pushToken: input.pushToken },
      });
    }

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
    });
    let evicted = 0;
    if (devices.length > MAX_DEVICES) {
      const stale = devices.slice(MAX_DEVICES);
      await prisma.device.deleteMany({
        where: { id: { in: stale.map((d) => d.id) } },
      });
      evicted = stale.length;
    }
    res.json({
      ok: true,
      deviceCount: Math.min(devices.length, MAX_DEVICES),
      evicted,
    });
  },
);
