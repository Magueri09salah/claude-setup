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
}

// ✗ skip column — number grid — ✓ confirm column (ui-design quiz recipe).
// No correctness colors here: corrections appear only on the results grid.
export function AnswerZone({
  answersCount,
  selected,
  onToggle,
  onConfirm,
  onSkip,
}: Props) {
  const numbers = Array.from({ length: answersCount }, (_, i) => i + 1);

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
        disabled={selected.length === 0}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.sideColumn,
          styles.confirm,
          selected.length === 0 && styles.confirmDisabled,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name="check" size={28} color={colors.success} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
