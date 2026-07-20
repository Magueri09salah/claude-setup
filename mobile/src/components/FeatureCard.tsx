import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, shadow, space } from "../theme/tokens";

interface Props {
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  onPress?: () => void;
}

// Feature card recipe: accent bg, white icon chip (44px, 20% white overlay),
// title 20/800 white, subtitle 13 white 75%, chevron. Height ~112.
export function FeatureCard({ title, subtitle, emoji, accent, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: accent },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.chip}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>{I18nManager.isRTL ? "‹" : "›"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 112,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    ...shadow.card,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  texts: { flex: 1, gap: 2 },
  title: {
    fontFamily: font.extraBold,
    fontSize: 20,
    color: colors.textOnDark,
    textAlign: "left",
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "left",
  },
  chevron: {
    fontFamily: font.extraBold,
    fontSize: 26,
    color: colors.textOnDark,
    opacity: 0.8,
  },
});
