import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from "expo-screen-capture";

/**
 * Blocks screenshots and screen recording for as long as the calling screen is
 * FOCUSED (owner decision 2026-10-05, scoped to the question screens only).
 *
 * Why only those screens: the question pictures are the paid content, and a
 * student screenshotting forty of them into a WhatsApp group is the leak that
 * actually happens. Everything else stays capturable on purpose — the school
 * runs its support on WhatsApp, and a student who cannot send a picture of the
 * problem cannot be helped.
 *
 * Focus, not mount: a pushed screen stays MOUNTED underneath whatever is on
 * top of it, so a mount-scoped guard (expo-screen-capture's own
 * `usePreventScreenCapture`) would keep blocking long after the quiz was left
 * behind. `useFocusEffect` turns the flag off the moment the screen is covered.
 *
 * The `key` MUST be unique per screen. The library refcounts these tags and
 * only re-allows capture once the set is empty, so two screens sharing one key
 * would let whichever blurs first unblock the other. Distinct keys make the
 * overlap safe.
 *
 * Fail-open, like the ads module: an unsupported device or an unavailable
 * native module must never be the reason the quiz does not open. A failure
 * means the screen is capturable, not that it is broken.
 *
 * PLATFORM REALITY, because the two are not the same protection:
 * - Android sets FLAG_SECURE. Screenshots AND screen recording both fail with
 *   a system message, and the app-switcher thumbnail goes blank.
 * - iOS has no API for this. The library reparents the key window's layer
 *   under a secure `UITextField` so captures come out blank — a trick, not a
 *   documented guarantee, and Apple can break it in any release. Treat iOS as
 *   best-effort and re-test the quiz on a real iPhone after an iOS upgrade.
 *
 * Neither platform stops a second phone photographing the screen. This raises
 * the effort, it does not make the content safe.
 */
export function useScreenCaptureGuard(key: string): void {
  useFocusEffect(
    useCallback(() => {
      void preventScreenCaptureAsync(key).catch(() => undefined);
      return () => {
        void allowScreenCaptureAsync(key).catch(() => undefined);
      };
    }, [key]),
  );
}
