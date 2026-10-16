import { useFocusEffect } from "expo-router";
import type { VideoViewProps } from "expo-video";
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

/**
 * iOS's `fullscreenOptions` (Android uses ANDROID_SECURE_FULLSCREEN below; the
 * pick is made once, in `SecureVideoView` in components/GuardedVideo.tsx).
 * It hides the NATIVE fullscreen button, which on iOS is the one way past the
 * capture guard above: expo-screen-capture blacks a recording out by adding a
 * view to the app's ROOT view (read in ScreenCaptureModule.swift), and
 * AVPlayerViewController presents its fullscreen ABOVE that root view.
 * GuardedVideo draws its own fullscreen instead, inside the root view.
 *
 * WHY A PROP AND NOT AN OMISSION (bug found 2026-10-14, on device): the first
 * attempt at this just DELETED `allowsFullscreen` from both players, on the
 * assumption that the button was opt-in. It is not. The chain, read in
 * node_modules:
 *   1. `VideoView.tsx` destructures `allowsFullscreen` and rebuilds it as
 *      `fullscreenOptions = { enable: allowsFullscreen, ...props.fullscreenOptions }`.
 *      With the prop omitted that object is `{ enable: undefined }`.
 *   2. Android's `Prop("fullscreenOptions")` decodes it into the Kotlin record
 *      `FullscreenOptions(@Field val enable: Boolean = true, ...)`, so
 *      `undefined` falls through to TRUE.
 *   3. `VideoView.kt`'s `init {}` has ALREADY called
 *      `playerView.setFullscreenButtonClickListener { enterFullscreen() }`
 *      unconditionally, and `enable = true` re-wires it.
 * So omitting the prop left fullscreen fully live and the player recordable —
 * `enable: false` is the only thing that takes the listener off and calls
 * `setFullscreenButtonVisibility(false)`.
 *
 * (That chain was found on ANDROID, where this was used until 2026-10-16; the
 * Android button is now ON and secured by a patch — see below.)
 *
 * Module-level on purpose — a fresh object literal in the render
 * body would re-run the native setter on every render.
 *
 * Do NOT use the deprecated `allowsFullscreen={false}` instead: it reaches the
 * same place but logs a deprecation warning on every render and is slated for
 * removal.
 */
export const NO_FULLSCREEN: NonNullable<VideoViewProps["fullscreenOptions"]> = {
  enable: false,
};

/**
 * Android's `fullscreenOptions`: the player's OWN fullscreen button (bottom
 * right), ON — owner decision 2026-10-16, one icon, the default one.
 *
 * Safe ONLY because of `patches/expo-video+3.0.16.patch`, applied by the
 * `postinstall` script on every install, EAS builds included. Stock
 * `FullscreenPlayerActivity` is a SEPARATE activity that sets no FLAG_SECURE —
 * expo-screen-capture only ever touches `currentActivity.window`, the main
 * one — and draws on a SurfaceView, whose layer FLAG_SECURE does not cover.
 * The patch sets the flag in its onCreate and makes its PlayerView a
 * TextureView. Without it this button opens a recordable screen (that is
 * exactly what the owner caught on vc 6).
 *
 * UPGRADING expo-video: the patch targets 3.0.16. `--error-on-fail` makes the
 * install — and so the EAS build — fail if it stops applying. Re-make it for
 * the new version; never delete it to get a build through.
 *
 * `orientation: "default"` = the activity follows the phone: upright stays
 * upright, turned goes landscape (owner choice "A", 2026-10-16). Spelled out
 * rather than left to a default, for the same reason as NO_FULLSCREEN.
 */
export const ANDROID_SECURE_FULLSCREEN: NonNullable<
  VideoViewProps["fullscreenOptions"]
> = {
  enable: true,
  orientation: "default",
};
