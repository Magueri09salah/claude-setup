import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

const MAX_DEVICES = 2;

// "Is this phone still the one signed in?" The app asks on launch and when it
// comes back to the foreground, because it otherwise works offline and could
// go a long time without a request that would notice. requireAuth does all
// the work (see modules/auth/session.ts). Lives here rather than under /auth
// so it never spends the /auth/* per-IP budget a whole school Wi-Fi shares.
devicesRouter.get("/session", (_req, res) => {
  res.status(204).end();
});

const pushTokenSchema = z.strictObject({
  deviceId: z.string().min(1).max(200),
  pushToken: z.string().max(300).nullable().optional(),
});

// Register/refresh this device's Expo push token. Security: max 2 devices per
// account — the oldest is evicted when a third appears.
devicesRouter.post("/push-token", async (req, res) => {
  const input = pushTokenSchema.parse(req.body);
  const userId = req.auth!.userId;

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

  const devices = await prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
  let evicted = 0;
  if (devices.length > MAX_DEVICES) {
    const stale = devices.slice(MAX_DEVICES);
    await prisma.device.deleteMany({ where: { id: { in: stale.map((d) => d.id) } } });
    evicted = stale.length;
  }
  res.json({ ok: true, deviceCount: Math.min(devices.length, MAX_DEVICES), evicted });
});
