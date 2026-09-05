import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  /** Changing this resets the zoom — one question should not inherit another's. */
  resetKey?: string | number;
}

/**
 * An image you can pinch and drag WHERE IT SITS — no tapping through to a
 * viewer first (owner decision 2026-08-18). Exam pictures carry small Arabic
 * text, so zooming is a normal part of reading the question, not a detour.
 */
export function ZoomableImage({ uri, style, resetKey }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // A new question starts at 1x; carrying the previous zoom over would leave
  // the candidate staring at a random corner of the next picture.
  useEffect(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  }, [resetKey, scale, savedScale, x, y, savedX, savedY]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, savedScale.value * e.scale),
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Recentre at 1x, otherwise zooming out leaves the picture off to a side.
      if (scale.value <= MIN_SCALE) {
        x.value = withTiming(0);
        y.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    // One finger only: two fingers belong to the pinch, and letting pan claim
    // them makes the picture lurch while zooming.
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE) return; // nothing to pan at 1x
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomed = scale.value > 1.2;
      const next = zoomed ? 1 : DOUBLE_TAP_SCALE;
      scale.value = withTiming(next);
      savedScale.value = next;
      if (zoomed) {
        x.value = withTiming(0);
        y.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      {/* overflow hidden so a zoomed picture cannot spill over the controls. */}
      <Animated.View style={[styles.clip, style]}>
        <Animated.View style={[styles.fill, animated]}>
          <Image
            source={{ uri }}
            style={styles.fill}
            contentFit="contain"
            transition={150}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1, width: "100%" },
});
