import Constants from "expo-constants";
import { Platform } from "react-native";
import mobileAds, {
  AdEventType,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from "react-native-google-mobile-ads";

/**
 * The full-screen ad shown between finishing a series and seeing the result.
 *
 * Every path through this file is failure-tolerant on purpose: an ad is worth
 * a few centimes and the result screen is the whole point of the app, so a
 * missing ad, a dead network, a slow fill or a crashing SDK must all end with
 * the candidate looking at their score. Nothing here ever rejects, and nothing
 * here ever makes the user wait longer than SHOW_TIMEOUT_MS.
 */

// Runtime ids live in app.json -> expo.extra.admob so they can be swapped
// without touching code. Empty = Google's test unit, which always fills and
// is labelled "Test Ad" — that is the state the app ships in until the real
// AdMob unit ids are pasted in.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  admob?: { androidInterstitialUnitId?: string; iosInterstitialUnitId?: string };
};

const configured = Platform.select({
  android: extra.admob?.androidInterstitialUnitId,
  ios: extra.admob?.iosInterstitialUnitId,
  default: "",
});

const UNIT_ID = configured && configured.length > 0 ? configured : TestIds.INTERSTITIAL;

/** Using a real unit id is the signal that this is a production ad setup. */
export const usingTestAds = UNIT_ID === TestIds.INTERSTITIAL;

// A series takes minutes, so this never fires in normal use. It exists for the
// degenerate case — opening and abandoning empty series in a row — which would
// otherwise show an ad every few seconds and is exactly what gets an AdMob
// account suspended.
const COOLDOWN_MS = 60_000;

// If the ad has not loaded by the time the last question is answered, we give
// up rather than park the candidate on a blank screen waiting for inventory.
const SHOW_TIMEOUT_MS = 1_500;

let initialized: Promise<unknown> | null = null;
let ad: InterstitialAd | null = null;
let loaded = false;
let lastShownAt = 0;

function initOnce(): Promise<unknown> {
  if (!initialized) {
    if (usingTestAds) {
      // Loud on purpose: shipping this state to Play means every candidate
      // sees "Test Ad" and the account earns nothing.
      console.warn(
        "[ads] using Google TEST ad units — set expo.extra.admob in app.json before release",
      );
    }
    initialized = mobileAds()
      .setRequestConfiguration({
        // A driving-school audience starts at 18, but gambling and adult
        // creatives next to an exam result would still be a bad look.
        maxAdContentRating: MaxAdContentRating.PG,
      })
      .then(() => mobileAds().initialize())
      .catch((e) => {
        console.warn("[ads] initialize failed:", e);
      });
  }
  return initialized;
}

/**
 * Start fetching an ad. Call this when a series STARTS: loading takes a few
 * seconds, and doing it up front is what makes the ad appear instantly at the
 * end instead of stalling the hand-off to the results screen.
 */
export function preloadInterstitial(): void {
  if (ad && loaded) return; // one already waiting
  void initOnce().then(() => {
    try {
      const next = InterstitialAd.createForAdRequest(UNIT_ID, {
        // No consent form is shipped, so we must not request personalised ads.
        // Removing this line without adding a UMP consent flow would breach
        // Google's EEA/UK consent policy.
        requestNonPersonalizedAdsOnly: true,
      });
      loaded = false;
      const done = next.addAdEventListener(AdEventType.LOADED, () => {
        loaded = true;
        done();
      });
      next.addAdEventListener(AdEventType.ERROR, (e) => {
        // No fill is the normal case for a new account, not a bug.
        console.warn("[ads] load failed:", e?.message ?? e);
        loaded = false;
      });
      ad = next;
      next.load();
    } catch (e) {
      console.warn("[ads] preload failed:", e);
      ad = null;
      loaded = false;
    }
  });
}

/**
 * Show the ad, resolving once it is dismissed. Resolves immediately when there
 * is nothing ready, so the caller can always `await` this and then navigate.
 */
export function showInterstitial(): Promise<void> {
  const current = ad;
  if (!current || !loaded) return Promise.resolve();
  if (Date.now() - lastShownAt < COOLDOWN_MS) return Promise.resolve();

  // Consumed either way: an interstitial object is single-use, and leaving a
  // stale one around would make the next series think an ad is ready.
  ad = null;
  loaded = false;
  lastShownAt = Date.now();

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    // The backstop that matters: if show() opens nothing, or CLOSED never
    // arrives because the SDK died, the results screen still appears.
    const timer = setTimeout(finish, SHOW_TIMEOUT_MS);

    try {
      current.addAdEventListener(AdEventType.CLOSED, finish);
      current.addAdEventListener(AdEventType.ERROR, finish);
      // Once it is actually on screen the user, not a timer, decides when to
      // leave — so stop the backstop and wait for CLOSED.
      current.addAdEventListener(AdEventType.OPENED, () => clearTimeout(timer));
      current.show();
    } catch (e) {
      console.warn("[ads] show failed:", e);
      finish();
    }
  });
}
