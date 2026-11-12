import { router } from "expo-router";
import { Alert } from "react-native";
import type { SessionUser } from "../api/client";

/**
 * Where login / register go once the account is in (guest mode, 2026-11-12).
 * Both are pushed ON TOP of the screen that asked for them, inside (main)'s
 * stack, so leaving means replacing or popping that one screen.
 *
 * - From a padlock (`next=unlock`) and the account is NOT open: on to /unlock,
 *   which is what a signed-in candidate's padlock opens. `replace`, so back
 *   from /unlock returns to the padlocked list, not to the form.
 * - Otherwise back to where the guest was. If the allowlist opened the account
 *   at sign-up, the padlocks there come off as the sync (already started by
 *   AuthContext) lands — say so, because that download takes a moment.
 */
export function continueAfterSignIn(
  user: SessionUser,
  next: string | undefined,
): void {
  if (next === "unlock" && !user.isPremium) {
    router.replace("/unlock");
    return;
  }
  if (router.canGoBack()) router.back();
  else router.replace("/");
  if (next === "unlock" && user.isPremium) {
    Alert.alert(
      "حسابك مفتوح بالكامل",
      "يتم الآن تحميل المحتوى — سيظهر خلال لحظات.",
    );
  }
}
