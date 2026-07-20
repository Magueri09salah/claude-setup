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
        placeholderTextColor={colors.textOnDarkDim}
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
    color: colors.textOnDarkDim,
    textAlign: "left",
  },
  input: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    color: colors.textOnDark,
    paddingHorizontal: space.md,
    fontFamily: font.regular,
    fontSize: 16,
    textAlign: "right",
  },
  ltr: {
    textAlign: "left",
    writingDirection: "ltr",
  },
});
