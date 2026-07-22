import { Pressable, StyleSheet, Text } from "react-native";
import { colors, font, radius } from "../../theme/tokens";

export type AnswerVisual = "default" | "selected" | "correct" | "wrong" | "dim";

// Night Drive: default = dark surface + hairline; SELECTED = lane-paint fill
// with asphalt numeral (unmistakable toggle). correct/wrong fills are used only
// on the review screen overlay.
function colorsFor(visual: AnswerVisual): { bg: string; fg: string; border: string } {
  switch (visual) {
    case "selected":
      return { bg: colors.lessons, fg: colors.onAccent, border: colors.lessons };
    case "correct":
      return { bg: colors.success, fg: colors.onAccent, border: colors.success };
    case "wrong":
      return { bg: colors.danger, fg: colors.onAccent, border: colors.danger };
    case "dim":
      return { bg: colors.surfaceAlt, fg: colors.textDim, border: colors.border };
    default:
      return { bg: colors.surface, fg: colors.text, border: colors.border };
  }
}

interface Props {
  value: number;
  visual: AnswerVisual;
  disabled?: boolean;
  onPress: (n: number) => void;
}

// Answer toggles fire 40+ times per quiz — the design-eng frequency rule says
// NO animation here: the state change itself is the feedback, instantly.
export function AnswerButton({ value, visual, disabled, onPress }: Props) {
  const c = colorsFor(visual);
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress(value)}
      style={[
        styles.button,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[styles.numeral, { color: c.fg }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  numeral: { fontFamily: font.extraBold, fontSize: 34 },
});
