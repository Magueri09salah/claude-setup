import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../Icon";
import { colors, font, radius, space } from "../../theme/tokens";
import { AnswerButton } from "./AnswerButton";

interface Props {
  answersCount: number;
  selected: number[];
  onToggle: (n: number) => void;
  onConfirm: () => void;
  /** ✗ — erases the current picks. It never submits and never advances. */
  onClear: () => void;
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
  onClear,
  vertical = false,
}: Props) {
  const numbers = Array.from({ length: answersCount }, (_, i) => i + 1);
  // Pairs, not a wrapping row — see the note on styles.grid.
  const pairs: number[][] = [];
  for (let i = 0; i < numbers.length; i += 2) pairs.push(numbers.slice(i, i + 2));
  // Nothing picked = nothing to erase, so ✗ dims instead of looking live.
  // ✓ stays enabled: with the countdown switched off it is the ONLY way past
  // a question the candidate cannot answer, and a blank submit is simply wrong
  // — exactly what the real terminal does.
  const clearDisabled = selected.length === 0;

  if (vertical) {
    return (
      <View style={styles.column}>
        <Pressable
          disabled={clearDisabled}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="مسح الاختيار"
          style={({ pressed }) => [
            styles.bar,
            styles.actionBar,
            styles.clearBar,
            clearDisabled && styles.disabled,
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
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="تأكيد"
          style={({ pressed }) => [
            styles.bar,
            styles.actionBar,
            styles.confirmBar,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icon name="check" size={26} color={colors.success} />
        </Pressable>
      </View>
    );
  }

  // ✗ erase column — number grid — ✓ confirm column (ui-design quiz recipe).
  return (
    <View style={styles.row}>
      <Pressable
        disabled={clearDisabled}
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="مسح الاختيار"
        style={({ pressed }) => [
          styles.sideColumn,
          styles.clear,
          clearDisabled && styles.disabled,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name="close" size={28} color={colors.danger} />
      </Pressable>

      <View style={styles.grid}>
        {pairs.map((pair, i) => (
          <View key={i} style={styles.gridRow}>
            {pair.map((n) => (
              <View key={n} style={styles.cell}>
                <AnswerButton
                  value={n}
                  visual={selected.includes(n) ? "selected" : "default"}
                  onPress={onToggle}
                />
              </View>
            ))}
            {/* An odd last button keeps its half width instead of stretching. */}
            {pair.length === 1 && <View style={styles.cell} />}
          </View>
        ))}
      </View>

      <Pressable
        onPress={onConfirm}
        accessibilityRole="button"
        accessibilityLabel="تأكيد"
        style={({ pressed }) => [
          styles.sideColumn,
          styles.confirm,
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
  clear: { backgroundColor: "rgba(229,72,77,0.16)" },
  confirm: { backgroundColor: "rgba(47,191,113,0.18)" },
  // EXPLICIT ROWS OF TWO, not a wrapping row with a percentage basis.
  //
  // Two bugs came out of trying to do this with flexWrap (owner reports
  // 2026-09-25). A percentage basis is resolved against whatever width Yoga
  // last measured for this container, and after rotating to landscape and back
  // the portrait pad returned one button per line with the ✓ column drawn on
  // top of the numbers — React Native defaults flexShrink to 0, so cells that
  // come out too wide overflow rather than shrink. Pairing the numbers up front
  // removes the percentage entirely: each row holds two cells at flex: 1, which
  // is always exactly half of whatever width the row actually has.
  grid: { flex: 1, gap: space.sm },
  gridRow: { flexDirection: "row", gap: space.sm },
  // flexDirection ROW inside the cell is load-bearing (it is what broke build
  // 10, where the numbers vanished): AnswerButton carries `flex: 1`, which means
  // flexBasis 0 on the container's MAIN axis. In a default column cell that axis
  // is vertical, so the button measured 0 tall. As a row, `flex: 1` sizes the
  // WIDTH and the button's own height: 64 governs.
  cell: { flex: 1, flexDirection: "row" },

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
  clearBar: { backgroundColor: "rgba(229,72,77,0.16)" },
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
