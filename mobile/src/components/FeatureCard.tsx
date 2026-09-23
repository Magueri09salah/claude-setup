import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, shadow, space } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

interface Props {
  title: string;
  subtitle: string;
  /** The chip glyph. Ignored when `letters` is given. */
  icon?: IconName;
  /**
   * Licence-category badge in place of the glyph: one small square per letter
   * (A · C · D). A single car icon said "car licence", which is the exact
   * opposite of what that card is for (owner decision 2026-09-23).
   */
  letters?: readonly string[];
  accent: string;
  onPress?: () => void;
}

// Night Drive card: dark surface with a 4px accent edge on the icon side —
// a road-sign post. Icon chip LEFT, Arabic text right-aligned. No chevron.
export function FeatureCard({
  title,
  subtitle,
  icon,
  letters,
  accent,
  onPress,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, { borderLeftColor: accent }]}
    >
      {letters ? (
        <View style={styles.letters}>
          {letters.map((letter) => (
            <View
              key={letter}
              style={[
                styles.letter,
                { backgroundColor: `${accent}38`, borderColor: accent },
              ]}
            >
              <Text style={[styles.letterText, { color: accent }]}>
                {letter}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.chip, { backgroundColor: `${accent}38` }]}>
          {icon && <Icon name={icon} size={24} color={accent} />}
        </View>
      )}
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
  // Three plates in a row, like the categories printed on a real licence.
  letters: { flexDirection: "row", gap: space.xs },
  letter: {
    width: 26,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // LTR: these are Latin licence letters, not Arabic text.
  letterText: { fontFamily: font.extraBold, fontSize: 15, writingDirection: "ltr" },
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
