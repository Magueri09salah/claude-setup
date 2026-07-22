import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, font, radius, space } from "../theme/tokens";

interface Props extends TextInputProps {
  label: string;
  // Email/password content is Latin — keep those fields LTR inside an RTL app.
  ltr?: boolean;
}

export function AppTextInput({ label, ltr = false, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, ltr && styles.ltr]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.textDim,
    textAlign: "right",
  },
  input: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space.md,
    fontFamily: font.regular,
    fontSize: 16,
    textAlign: "right",
  },
  // Latin content (email/password) stays left-to-right and left-aligned.
  ltr: {
    textAlign: "left",
    writingDirection: "ltr",
  },
});
