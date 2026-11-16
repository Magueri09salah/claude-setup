import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Which phone this is, for the server's "first phone wins" rule (owner
 * decision 2026-11-16, API modules/auth/session.ts): a candidate account is
 * tied to the first phone that signs in with it, and every other phone is
 * refused. Sent as `X-Device-Id` on /auth/* calls by api/client.ts.
 *
 * It has to survive a REINSTALL, or a student who deletes and reinstalls the
 * app would be locked out of their own account on their own phone:
 * - Android: the Android ID. Kept across reinstalls; changes only on a factory
 *   reset. It is per signing key, so a PREVIEW build and the Play Store build
 *   give the same phone two different ids.
 * - iOS: has no such id (identifierForVendor resets when the app is deleted),
 *   so the first value is stored in the KEYCHAIN, which iOS keeps after the
 *   app is deleted.
 *
 * NOT the push `device_id` in notifications/push.ts: that one lives in SQLite
 * and is wiped with the app.
 */
const STORE_KEY = "codeboujida.device";

let pending: Promise<string> | null = null;

export function getDeviceId(): Promise<string> {
  pending ??= resolveDeviceId().catch((e: unknown) => {
    pending = null; // try again next time instead of caching the failure
    throw e;
  });
  return pending;
}

async function resolveDeviceId(): Promise<string> {
  if (Platform.OS === "android") {
    try {
      const id = Application.getAndroidId();
      if (id) return `android:${id}`;
    } catch {
      // fall through to the stored id
    }
  }
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  if (stored) return stored;
  const vendorId =
    Platform.OS === "ios"
      ? await Application.getIosIdForVendorAsync().catch(() => null)
      : null;
  const id = vendorId
    ? `ios:${vendorId}`
    : `device:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await SecureStore.setItemAsync(STORE_KEY, id);
  return id;
}
