import { Image } from "expo-image";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, font, radius, space, type } from "../theme/tokens";
import { Icon } from "./Icon";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface Props {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
  /** Optional caption, e.g. the sign's name. */
  title?: string;
}

// Fullscreen image viewer: pinch/double-tap to zoom, drag to pan, and a button
// to turn the phone to landscape ("tablet mode") for the wide exam pictures,
// which are unreadable letterboxed into a portrait card.
export function ImageViewer({ uri, visible, onClose, title }: Props) {
  const { width, height } = useWindowDimensions();
  const [landscape, setLandscape] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  }, [scale, savedScale, x, y, savedX, savedY]);

  // The whole app rotates freely now, so closing the viewer must hand control
  // back to the device (DEFAULT), not force portrait — that would leave the app
  // stuck upright after every zoom.
  useEffect(() => {
    if (!visible) return;
    return () => {
      setLandscape(false);
      void ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, [visible]);

  // The button still exists because a picture is often easier to read forced
  // wide, even when the device itself is being held upright.
  const toggleRotate = () => {
    const next = !landscape;
    setLandscape(next);
    reset();
    void (
      next
        ? ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
          )
        : ScreenOrientation.unlockAsync()
    ).catch(() => undefined);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Snapping back at 1x stops the image drifting off-centre after a zoom out.
      if (scale.value <= MIN_SCALE) {
        x.value = withTiming(0);
        y.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Panning only makes sense once the image is bigger than the screen.
      if (scale.value <= MIN_SCALE) return;
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
      scale.value = withTiming(zoomed ? 1 : 2.5);
      savedScale.value = zoomed ? 1 : 2.5;
      if (zoomed) {
        x.value = withTiming(0);
        y.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
      runOnJS(setLandscape)(landscape);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible && !!uri}
      transparent={false}
      animationType="fade"
      onRequestClose={close}
      // Let the modal follow the orientation we lock below.
      supportedOrientations={["portrait", "landscape"]}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <View style={styles.bar}>
          <Pressable onPress={close} hitSlop={10} style={styles.barButton}>
            <Icon name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.barActions}>
            <Pressable
              onPress={toggleRotate}
              hitSlop={10}
              style={[styles.pill, landscape && styles.pillActive]}
              accessibilityRole="button"
              accessibilityLabel={landscape ? "العودة للوضع العمودي" : "وضع أفقي"}
            >
              <Icon
                name="rotate"
                size={16}
                color={landscape ? colors.onAccent : colors.text}
              />
              <Text style={[styles.pillText, landscape && styles.pillTextActive]}>
                {landscape ? "عمودي" : "أفقي"}
              </Text>
            </Pressable>
            <Pressable onPress={reset} hitSlop={10} style={styles.pill}>
              <Icon name="zoomReset" size={16} color={colors.text} />
              <Text style={styles.pillText}>إعادة الضبط</Text>
            </Pressable>
          </View>
        </View>

        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.stage}>
            {uri && (
              <Animated.View style={imageStyle}>
                <Image
                  source={{ uri }}
                  style={{ width, height: height - 140 }}
                  contentFit="contain"
                />
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          {title ? <Text style={styles.caption}>{title}</Text> : null}
          <Text style={styles.hint}>
            قرّب بإصبعين أو انقر مرتين للتكبير · اسحب للتحريك
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.xxl,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  barButton: { padding: space.xs },
  barActions: { flexDirection: "row", gap: space.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
  },
  pillActive: { backgroundColor: colors.lessons },
  pillText: { ...type.label, color: colors.text },
  pillTextActive: { color: colors.onAccent },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  footer: { padding: space.lg, gap: space.xs },
  caption: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  hint: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "center" },
});
