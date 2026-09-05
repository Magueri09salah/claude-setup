import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, space } from "../../theme/tokens";

interface Props {
  answersCount: number;
  selected: number[];
  /** Landscape side-strip: same read-out, sized for a ~190pt column. */
  compact?: boolean;
}

/**
 * Read-out of the current answer, POSITIONAL: slot n shows n only when n is
 * selected, otherwise it stays blank. Picking 1 and 3 reads "1 _ 3 _", so the
 * candidate can see at a glance which numbers are in without decoding a list.
 * Mirrors the official exam terminal (owner reference 2026-08-14).
 */
export function AnswerSlots({ answersCount, selected, compact }: Props) {
  const slots = Array.from({ length: answersCount }, (_, i) => i + 1);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={
        selected.length > 0
          ? `الأجوبة المختارة: ${[...selected].sort((a, b) => a - b).join("، ")}`
          : "لم تختر أي جواب"
      }
    >
      {slots.map((n) => {
        const on = selected.includes(n);
        return (
          <View
            key={n}
            style={[
              styles.slot,
              compact && styles.slotCompact,
              on && styles.slotOn,
            ]}
          >
            <Text
              style={[
                styles.text,
                compact && styles.textCompact,
                on && styles.textOn,
              ]}
            >
              {on ? n : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  slot: {
    flex: 1,
    maxWidth: 76,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  slotCompact: { height: 42, maxWidth: 48 },
  slotOn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.lessons,
  },
  // Empty slots keep the same glyph metrics, so the row never shifts.
  text: { fontFamily: font.extraBold, fontSize: 24, color: colors.textDim },
  textCompact: { fontSize: 18 },
  textOn: { color: colors.lessons },
});
