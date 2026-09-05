import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../Icon";
import { colors, font, radius, space } from "../../theme/tokens";
import { AnswerButton } from "./AnswerButton";

interface Props {
  answersCount: number;
  selected: number[];
  onToggle: (n: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
  /**
   * Landscape: one narrow column on the side of the picture — ✗, the numbers,
   * then ✓, each a full-width row. Matches the official exam terminal (owner
   * reference 2026-08-14). Portrait keeps ✗ | grid | ✓ side by side, which
   * suits a tall screen far better.
   */
  vertical?: boolean;
}

// No correctness colors here: corrections appear only on the results grid.
export function AnswerZone({
  answersCount,
  selected,
  onToggle,
  onConfirm,
  onSkip,
  vertical = false,
}: Props) {
  const numbers = Array.from({ length: answersCount }, (_, i) => i + 1);
  const confirmDisabled = selected.length === 0;

  if (vertical) {
    return (
      <View style={styles.column}>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="تخطي"
          style={({ pressed }) => [
            styles.bar,
            styles.actionBar,
            styles.skipBar,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icon name="close" size={26} color={colors.danger} />
        </Pressable>

        {numbers.map((n) => {
          const on = selected.includes(n);
          return (
            <Pressable
              key={n}
              onPress={() => onToggle(n)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.bar,
                styles.numberBar,
                on && styles.numberBarOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.numberText, on && styles.numberTextOn]}>
                {n}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          disabled={confirmDisabled}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="تأكيد"
          style={({ pressed }) => [
            styles.bar,
            styles.actionBar,
            styles.confirmBar,
            confirmDisabled && styles.disabled,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icon name="check" size={26} color={colors.success} />
        </Pressable>
      </View>
    );
  }

  // ✗ skip column — number grid — ✓ confirm column (ui-design quiz recipe).
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onSkip}
        style={({ pressed }) => [
          styles.sideColumn,
          styles.skip,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name="close" size={28} color={colors.danger} />
      </Pressable>

      <View style={styles.grid}>
        {numbers.map((n) => (
          <AnswerButton
            key={n}
            value={n}
            visual={selected.includes(n) ? "selected" : "default"}
            onPress={onToggle}
          />
        ))}
      </View>

      <Pressable
        disabled={confirmDisabled}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.sideColumn,
          styles.confirm,
          confirmDisabled && styles.confirmDisabled,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name="check" size={28} color={colors.success} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- portrait ----
  row: { flexDirection: "row", gap: space.sm, alignItems: "stretch" },
  sideColumn: {
    width: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  skip: { backgroundColor: "rgba(229,72,77,0.16)" },
  confirm: { backgroundColor: "rgba(47,191,113,0.18)" },
  confirmDisabled: { opacity: 0.4 },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    justifyContent: "center",
  },

  // ---- landscape: one stacked column ----
  // flex:1 on the column AND on each bar, so six buttons always divide the
  // height that is actually there. Fixed heights overflowed a short landscape
  // screen — the column spilled over the header and off the bottom.
  column: { flex: 1, gap: space.xs },
  bar: {
    flex: 1,
    // Low enough that six bars still fit a rotated PHONE (~393pt tall), not
    // just a tablet; they grow to fill whatever height is actually there.
    minHeight: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // ✗ and ✓ are single taps, not things you read — they get less height than
  // the numbers, which are the ones being compared and chosen between.
  // 28 rather than the usual 44 touch minimum: these bars are ~170pt WIDE, so
  // the target stays easy to hit, and a taller floor would clamp and push the
  // column past the bottom of a rotated phone.
  actionBar: { flex: 0.6, minHeight: 28 },
  skipBar: { backgroundColor: "rgba(229,72,77,0.16)" },
  confirmBar: { backgroundColor: "rgba(47,191,113,0.18)" },
  disabled: { opacity: 0.4 },
  numberBar: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberBarOn: {
    backgroundColor: colors.lessons,
    borderColor: colors.lessons,
  },
  numberText: { fontFamily: font.extraBold, fontSize: 24, color: colors.text },
  numberTextOn: { color: colors.onAccent },
});
