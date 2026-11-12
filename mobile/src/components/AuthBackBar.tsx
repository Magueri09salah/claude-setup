import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "../theme/tokens";
import { Icon } from "./Icon";

/**
 * Back arrow for login / register. Since guest mode (2026-11-12) those screens
 * are no longer the app's front door but pages opened from inside it — a
 * padlock, «حجز حصة سياقة», the settings card — so the visitor must be able
 * to change their mind. Same arrow, size and place as every pushed screen.
 */
export function AuthBackBar() {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="رجوع"
      >
        <Icon name="back" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the forms' own column so the arrow lines up with them on a tablet.
  bar: {
    flexDirection: "row",
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
});
