import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, space } from "../../theme/tokens";
import { Icon } from "../Icon";

// Night Drive signature: a dashboard readout — asphalt pill with lane-yellow
// digits, flipping to signal-red with a gentle pulse under 10s. Tapping it
// opens the per-question duration picker.
export function TimerPill({
  seconds,
  total,
  onPress,
}: {
  seconds: number;
  /** The full duration for this question, so the alert scales with it. */
  total: number;
  onPress?: () => void;
}) {
  // A fixed "under 10s" alert would keep a 10s question red from the start,
  // so the threshold is a third of the chosen duration instead.
  const danger = seconds <= Math.max(3, Math.round(total / 3));
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!danger) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [danger, scale]);

  const shown = Math.max(0, seconds);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={8}
        style={[styles.pill, danger && styles.pillDanger]}
        accessibilityRole="button"
        accessibilityLabel={`الوقت المتبقي ${shown} ثانية — اضغط لتغيير المدة`}
      >
        <Text style={[styles.text, danger && styles.textDanger]}>{shown}s</Text>
        {onPress && (
          <View style={styles.affordance}>
            <Icon
              name="timer"
              size={13}
              color={danger ? colors.text : colors.textDim}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 56,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  affordance: { opacity: 0.9 },
  pillDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  text: { fontFamily: font.extraBold, fontSize: 18, color: colors.lessons },
  textDanger: { color: colors.text },
});
