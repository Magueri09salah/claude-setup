import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { colors, font, radius } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accent?: string;
}

// Primary action = lane-paint yellow with asphalt ink (Night Drive).
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accent = colors.lessons,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: accent, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.onAccent,
  },
});
