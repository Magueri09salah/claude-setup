import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, shadow, space } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

interface Props {
  title: string;
  subtitle: string;
  icon: IconName;
  accent: string;
  onPress?: () => void;
}

// Night Drive card: dark surface with a 4px accent edge on the icon side —
// a road-sign post. Icon chip LEFT, Arabic text right-aligned. No chevron.
export function FeatureCard({ title, subtitle, icon, accent, onPress }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, { borderLeftColor: accent }]}
    >
      <View style={[styles.chip, { backgroundColor: `${accent}38` }]}>
        <Icon name={icon} size={24} color={accent} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </PressableScale>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadow.card,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, gap: 2 },
  // Lane yellow, not white: the four menu titles are the loudest thing on the
  // home screen (owner decision 2026-08-18). The subtitle stays dim so the two
  // lines don't compete.
  title: {
    fontFamily: font.extraBold,
    fontSize: 20,
    color: colors.lessons,
    textAlign: "right",
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.textDim,
    textAlign: "right",
  },
});
