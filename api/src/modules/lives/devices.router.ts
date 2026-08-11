import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

const MAX_DEVICES = 2;

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
