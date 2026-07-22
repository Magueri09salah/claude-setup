import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { colors, font, radius, space } from "../../theme/tokens";

// Night Drive signature: a dashboard readout — asphalt pill with lane-yellow
// digits, flipping to signal-red with a gentle pulse under 10s.
export function TimerPill({ seconds }: { seconds: number }) {
  const danger = seconds <= 10;
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
    <Animated.View
      style={[
        styles.pill,
        danger && styles.pillDanger,
        { transform: [{ scale }] },
      ]}
    >
      <Text style={[styles.text, danger && styles.textDanger]}>{shown}s</Text>
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
    alignItems: "center",
    justifyContent: "center",
  },
  pillDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  text: { fontFamily: font.extraBold, fontSize: 18, color: colors.lessons },
  textDanger: { color: colors.text },
});
