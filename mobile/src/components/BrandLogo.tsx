import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, type StyleProp, type ImageStyle } from "react-native";
import { getMeta } from "../db";
import { useSyncStatus } from "../sync/useSyncStatus";

/** Shipped in the binary. What a fresh install shows before its first sync. */
const BUNDLED = require("../../assets/images/logo.png");

/**
 * The logo the owner uploaded in the panel, cached on disk by the sync, or
 * null when they never set one.
 *
 * Read on every call rather than memoised: it is a single SQLite lookup of one
 * short string, and caching it would mean a freshly synced logo did not appear
 * until the app restarted.
 */
function storedLogo(): string | null {
  const path = getMeta("logo_path");
  return path && path.length > 0 ? path : null;
}

interface Props {
  /** Rendered square. 120 suits a launch screen, 88 a header. */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * The Auto École Boujida badge. One component so the login screen, the
 * first-sync screen and anywhere else it appears can never drift apart.
 *
 * The picture itself is swappable from the admin panel (owner request
 * 2026-09-26) — the SIZE is not, and stays wherever each caller sets it.
 */
export function BrandLogo({ size = 120, style }: Props) {
  // Re-read when a sync finishes: that is the moment a replaced logo lands on
  // disk, and the screen showing it may never unmount in between.
  const sync = useSyncStatus();
  const [uri, setUri] = useState<string | null>(storedLogo);
  useEffect(() => {
    setUri(storedLogo());
  }, [sync]);

  return (
    <Image
      source={uri ? { uri } : BUNDLED}
      // A downloaded file can be deleted from under us (repair button, OS
      // cleanup). Falling back keeps a blank square off the login screen.
      onError={() => setUri(null)}
      style={[{ width: size, height: size }, styles.base, style]}
      contentFit="contain"
      // Static asset: no fade-in, and it must not flicker between screens.
      transition={0}
      accessible
      accessibilityLabel="code boujida"
    />
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "center" },
});
