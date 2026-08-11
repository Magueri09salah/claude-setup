import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { api } from "../api/client";
import { getMeta, setMeta } from "../db";

// Foreground behaviour: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Stable per-install device id (the API keys devices on it, max 2 per account).
function deviceId(): string {
  let id = getMeta("device_id");
  if (!id) {
    id = `${Platform.OS}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    setMeta("device_id", id);
  }
  return id;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "التنبيهات",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FFD348",
  });
}

// Ask permission, get the Expo push token, and register it with the API.
// Safe to call on every login; silent-fails without a projectId (Expo Go).
export async function registerPushToken(): Promise<string | null> {
  try {
    await ensureAndroidChannel();
    if (!Device.isDevice) return null; // simulators can't receive remote push

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    // A real projectId is required for remote push (dev build / EAS).
    if (!projectId || projectId.startsWith("00000000")) return null;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api("/devices/push-token", {
      method: "POST",
      json: { deviceId: deviceId(), pushToken: token },
    });
    return token;
  } catch {
    return null; // never block the app on push setup
  }
}

// Clear the token server-side on logout so the device stops receiving pushes.
export async function unregisterPushToken(): Promise<void> {
  try {
    await api("/devices/push-token", {
      method: "POST",
      json: { deviceId: deviceId(), pushToken: null },
    });
  } catch {
    // ignore
  }
}

interface LivePayload {
  type?: string;
}

// The live runs on four platforms at once, so a notification can't deep-link to
// one stream — it opens the lives screen and lets the viewer pick.
export function handleNotificationData(data: unknown): void {
  const payload = (data ?? {}) as LivePayload;
  if (payload.type === "live") router.push("/lives");
}

// Wire tap handling: both a cold start from a notification and taps while running.
export function attachNotificationHandlers(): () => void {
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleNotificationData(response.notification.request.content.data);
    }
  });
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationData(response.notification.request.content.data);
  });
  return () => sub.remove();
}

// Dev-only: fire a LOCAL notification that looks and behaves like the real live
// push (same data payload), so the appearance and tap-to-open flow can be
// verified without a paid Apple account or a push server.
export async function sendTestLocalNotification(): Promise<boolean> {
  try {
    await ensureAndroidChannel();
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "بدأ البث المباشر",
        body: "بث تجريبي — اضغط لاختيار المنصة",
        data: { type: "live" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: "default",
      },
    });
    return true;
  } catch {
    return false;
  }
}
