import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, font, radius } from "../theme/tokens";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accent?: string;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accent = colors.series,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: accent, opacity: disabled ? 0.5 : 1 },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnDark} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
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
    color: colors.textOnDark,
  },
});
