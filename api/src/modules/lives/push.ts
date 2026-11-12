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

  // Clear tokens Expo says are dead so we stop pushing to them. A guest row is
  // nothing BUT its token, so it is deleted outright — that is also what keeps
  // the anonymous table from growing with uninstalled phones.
  if (deadTokens.length > 0) {
    await prisma.device.updateMany({
      where: { pushToken: { in: deadTokens } },
      data: { pushToken: null },
    });
    await prisma.guestDevice.deleteMany({
      where: { pushToken: { in: deadTokens } },
    });
  }
  return reach;
}

// All registered push tokens. Live pushes go to everyone — signed-in phones AND
// guests (owner decision 2026-11-12). sendPush de-duplicates, so a token found
// in both tables still gets ONE notification.
export async function allPushTokens(): Promise<string[]> {
  const [devices, guests] = await Promise.all([
    prisma.device.findMany({
      where: { pushToken: { not: null } },
      select: { pushToken: true },
    }),
    prisma.guestDevice.findMany({ select: { pushToken: true } }),
  ]);
  return [
    ...devices.map((d) => d.pushToken!).filter(Boolean),
    ...guests.map((g) => g.pushToken),
  ];
}
