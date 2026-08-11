import { StyleSheet, Text, View } from "react-native";
import {
  TIMER_CHOICES,
  TIMER_LABELS,
  type TimerChoice,
} from "../../quiz/timerPref";
import { colors, font, radius, space, type } from "../../theme/tokens";
import { Icon } from "../Icon";
import { PressableScale } from "../PressableScale";

interface Props {
  value: TimerChoice;
  onChange: (value: TimerChoice) => void;
}

// Shared by the in-quiz sheet and the settings tab so the two can never drift.
// RTL convention (ui-design §5): control/icon on the LEFT, Arabic text right.
export function TimerChoiceList({ value, onChange }: Props) {
  return (
    <View style={styles.list}>
      {TIMER_CHOICES.map((choice) => {
        const meta = TIMER_LABELS[choice];
        const selected = choice === value;
        return (
          <PressableScale
            key={choice}
            onPress={() => onChange(choice)}
            style={[styles.row, selected && styles.rowSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${meta.title} — ${meta.hint}`}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && (
                <Icon name="check" size={14} color={colors.onAccent} />
              )}
            </View>
            <View style={styles.texts}>
              <Text style={[styles.title, selected && styles.titleSelected]}>
                {meta.title}
              </Text>
              <Text style={styles.hint}>{meta.hint}</Text>
            </View>
            <Icon
              name={meta.icon}
              size={22}
              color={selected ? colors.lessons : colors.textDim}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  rowSelected: {
    borderColor: colors.lessons,
    backgroundColor: "rgba(255,211,72,0.10)",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.textDim,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: colors.lessons,
    borderColor: colors.lessons,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.text, textAlign: "right" },
  titleSelected: { color: colors.lessons },
  hint: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
});
