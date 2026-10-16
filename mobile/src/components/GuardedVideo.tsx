import { useFocusEffect, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { VideoView, type VideoPlayer } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ANDROID_SECURE_FULLSCREEN,
  NO_FULLSCREEN,
} from "@/security/screenCapture";
import { colors, radius, space } from "@/theme/tokens";
import { Icon } from "./Icon";

/**
 * Fullscreen for the premium video screens (owner decision 2026-10-16): ONE
 * icon, the video fills the screen UPRIGHT and simply follows the phone if it
 * is turned (nothing is forced sideways), and it is never recordable.
 *
 * The two platforms get there differently, because their recording block
 * works differently:
 * - ANDROID uses the player's own icon (bottom-right) and its own fullscreen
 *   activity, made recording-proof by patches/expo-video+3.0.16.patch — see
 *   ANDROID_SECURE_FULLSCREEN.
 * - iOS cannot use Apple's: AVPlayerViewController presents its fullscreen
 *   ABOVE the root view that expo-screen-capture blacks out. So iOS keeps it
 *   off (NO_FULLSCREEN) and gets ours instead — a top-left icon (where the
 *   iPhone's own sits) that moves the video into an absolute-fill overlay on
 *   the same screen, i.e. INSIDE the root view, under the black-out.
 *
 * NEVER render that overlay in a <Modal>: a Modal is presented above the root
 * view too, out of the black-out's reach.
 *
 * The screen keeps calling `useScreenCaptureGuard` itself; this only decides
 * how fullscreen is drawn.
 */
const OWN_FULLSCREEN = Platform.OS === "ios";
const FULLSCREEN_OPTIONS = OWN_FULLSCREEN
  ? NO_FULLSCREEN
  : ANDROID_SECURE_FULLSCREEN;

/** Our fullscreen's state. On Android it simply never turns on. */
export function useVideoFullscreen() {
  const navigation = useNavigation();
  const [isFullscreen, setFullscreen] = useState(false);

  // An edge swipe while scrubbing would pop the screen out from under the video.
  useEffect(() => {
    if (!isFullscreen) return;
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [isFullscreen, navigation]);

  // A screen pushed on top would otherwise inherit the hidden status bar.
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
 * - `fullscreenOptions`: per platform, see FULLSCREEN_OPTIONS above.
 */
function SecureVideoView({ player }: { player: VideoPlayer }) {
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      surfaceType="textureView"
      fullscreenOptions={FULLSCREEN_OPTIONS}
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
          {/* iOS only — Android shows the player's own icon. Rendered after
              the video so it sits on top. */}
          {OWN_FULLSCREEN && (
            <Pressable
              onPress={onEnterFullscreen}
              hitSlop={10}
              style={[styles.button, styles.buttonInline]}
              accessibilityRole="button"
              accessibilityLabel="ملء الشاشة"
            >
              <Icon name="fullscreen" size={22} color={colors.text} />
            </Pressable>
          )}
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
 * covers the whole screen and is drawn on top of it. No orientation lock: the
 * app rotates freely, so the overlay follows the phone on its own.
 */
export function FullscreenVideo({ player, onExit }: FullscreenProps) {
  // Turned sideways, the notch and home indicator sit BESIDE the content.
  const insets = useSafeAreaInsets();
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
