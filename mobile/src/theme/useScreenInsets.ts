import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "./tokens";

/**
 * Bottom padding for a full-screen scroll body.
 *
 * The app draws EDGE TO EDGE on Android (SDK 54 leaves no way not to), so the
 * system navigation bar is painted on top of the content. A screen that ends
 * with `padding: space.lg` therefore hides its last card behind the 3-button
 * bar — the owner reported exactly that on the series list and the results
 * grid (2026-09-23). The quiz screen was already doing this by hand; this hook
 * is the same sum in one place so no screen is missed again.
 *
 * Tab screens do NOT need it: the tab bar is laid out above the scene and
 * carries the inset itself (see the tabs layout).
 *
 * @param extra breathing room above the bar, on top of its height.
 */
export function useBottomInset(extra: number = space.xl): number {
  return useSafeAreaInsets().bottom + extra;
}
