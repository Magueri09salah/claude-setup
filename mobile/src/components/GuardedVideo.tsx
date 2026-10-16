import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect, useNavigation } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { VideoView, type VideoPlayer } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NO_FULLSCREEN } from "@/security/screenCapture";
import { colors, radius, space } from "@/theme/tokens";
import { Icon } from "./Icon";

/**
 * Our OWN fullscreen for the premium video screens (owner request 2026-10-16:
 * "the button to make the video large must work, and the recording block must
 * work on it too").
 *
 * expo-video's built-in fullscreen cannot be used: on Android it opens
 * `FullscreenPlayerActivity`, a SEPARATE activity that sets no FLAG_SECURE AND
 * inflates a plain PlayerView, i.e. a SurfaceView — two leaks at once (both
 * read in node_modules). So the native button stays OFF (NO_FULLSCREEN) and
 * this one replaces it: the video is moved into an absolute-fill overlay ON
 * THE SAME SCREEN, the phone is turned to landscape, and the status bar and
 * Android's navigation buttons are hidden.
 * Same activity, same window, same TextureView — exactly the setup the owner
 * already recorded black on device (vc 7), so fullscreen inherits it.
 *
 * NEVER render the fullscreen player in a <Modal>: on Android a Modal is its
 * own dialog window, which the activity's FLAG_SECURE does not cover.
 *
 * The screen keeps calling `useScreenCaptureGuard` itself; this only decides
 * WHERE the player is drawn.
 */
export function useVideoFullscreen() {
  const navigation = useNavigation();
  const [isFullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ).catch(() => undefined);
    // Android back leaves fullscreen first, like every video app — not the screen.
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      setFullscreen(false);
      return true;
    });
    // iOS: an edge swipe while scrubbing near the left edge would pop the screen.
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      back.remove();
      navigation.setOptions({ gestureEnabled: true });
      // Hand rotation back to the device, never lock portrait — same rule as
      // ImageViewer, or the whole app stays stuck upright.
      void ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, [isFullscreen, navigation]);

  // A screen pushed on top (e.g. a tapped notification) must not inherit the
  // landscape lock. The effect above undoes it once this flips back.
  useFocusEffect(useCallback(() => () => setFullscreen(false), []));

  const enter = useCallback(() => setFullscreen(true), []);
  const exit = useCallback(() => setFullscreen(false), []);
  return { isFullscreen, enter, exit };
}

/**
 * The ONE place the capture-relevant VideoView props live, so a new player
 * cannot forget one:
 * - `surfaceType="textureView"`: the default SurfaceView gets its own
 *   compositor layer that FLAG_SECURE does NOT cover — a recording captured the
 *   video while the rest of the screen went black.
 * - `fullscreenOptions={NO_FULLSCREEN}`: hides the native button that opens the
 *   unprotected activity. Omitting it is NOT enough; see NO_FULLSCREEN.
 */
function SecureVideoView({ player }: { player: VideoPlayer }) {
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      surfaceType="textureView"
      fullscreenOptions={NO_FULLSCREEN}
      nativeControls
    />
  );
}

interface InlineProps {
  player: VideoPlayer;
  /** The 16:9 box. Stays in the layout while fullscreen, so nothing jumps. */
  style: StyleProp<ViewStyle>;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
}

/**
 * The player inside its card. While fullscreen it renders an empty box: ONE
 * VideoView per player at a time, and the list underneath keeps its scroll
 * position for when the candidate comes back.
 */
export function InlineVideo({
  player,
  style,
  isFullscreen,
  onEnterFullscreen,
}: InlineProps) {
  return (
    <View style={style}>
      {!isFullscreen && (
        <>
          <SecureVideoView player={player} />
          {/* Top-left: the native controls leave that corner empty on both
              platforms (Android's bar is at the bottom, iOS's volume is
              top-right). Rendered after the video so it sits on top. */}
          <Pressable
            onPress={onEnterFullscreen}
            hitSlop={10}
            style={[styles.button, styles.buttonInline]}
            accessibilityRole="button"
            accessibilityLabel="ملء الشاشة"
          >
            <Icon name="fullscreen" size={22} color={colors.text} />
          </Pressable>
        </>
      )}
    </View>
  );
}

interface FullscreenProps {
  player: VideoPlayer;
  onExit: () => void;
}

/**
 * Render as the LAST child of the screen's root (after the ScrollView), so it
 * covers the whole screen and is drawn on top of it.
 */
export function FullscreenVideo({ player, onExit }: FullscreenProps) {
  // Landscape puts the notch and home indicator BESIDE the content.
  const insets = useSafeAreaInsets();

  // Android's back/home/recents buttons, hidden for as long as this is mounted
  // (owner request 2026-10-16). A swipe from the edge brings them back
  // temporarily, which is the system's own fullscreen behaviour. Android only:
  // the iOS build of this call does nothing but log a warning. setVisibilityAsync
  // is the one call the library still supports under edge-to-edge; leave
  // setBehaviorAsync / setBackgroundColorAsync alone, they are no-ops there.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void NavigationBar.setVisibilityAsync("hidden").catch(() => undefined);
    return () => {
      void NavigationBar.setVisibilityAsync("visible").catch(() => undefined);
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.fullscreen]}>
      <StatusBar hidden />
      <SecureVideoView player={player} />
      <Pressable
        onPress={onExit}
        hitSlop={10}
        style={[
          styles.button,
          {
            top: Math.max(insets.top, space.md),
            left: Math.max(insets.left, space.md),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="الخروج من ملء الشاشة"
      >
        <Icon name="fullscreenExit" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Plain black like ImagePager: nothing should compete with the picture.
  fullscreen: { backgroundColor: "#000000" },
  button: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInline: { top: space.sm, left: space.sm },
});
