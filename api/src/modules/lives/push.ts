import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../../prisma";

const expo = new Expo();

export interface PushContent {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Send to a set of Expo push tokens. expo-server-sdk chunks into batches of 100
// automatically. Invalid tokens for expired devices are pruned. Returns the
// number of notifications accepted by Expo (the "reach").
export async function sendPush(
  tokens: string[],
  content: PushContent,
): Promise<number> {
  const valid = [...new Set(tokens)].filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return 0;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: "default",
    title: content.title,
    body: content.body,
    data: content.data ?? {},
    priority: "high",
    channelId: "default",
  }));

  let reach = 0;
  const deadTokens: string[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") {
          reach += 1;
        } else if (
          ticket.details?.error === "DeviceNotRegistered" &&
          chunk[i]
        ) {
          deadTokens.push(chunk[i].to as string);
        }
      });
    } catch (err) {
      console.error("[push] chunk failed", err);
    }
  }

  // Clear tokens Expo says are dead so we stop pushing to them.
  if (deadTokens.length > 0) {
    await prisma.device.updateMany({
      where: { pushToken: { in: deadTokens } },
      data: { pushToken: null },
    });
  }
  return reach;
}

// All registered push tokens (one per device). Live pushes go to everyone.
export async function allPushTokens(): Promise<string[]> {
  const devices = await prisma.device.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });
  return devices.map((d) => d.pushToken!).filter(Boolean);
}
