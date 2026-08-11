import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useLive } from "../lives/useLive";
import { colors, font, radius, space } from "../theme/tokens";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

// Header bell. The live is a daily fixture, so the badge is not a count of
// events — it flags the one occurrence that is on air or about to start and
// that the user hasn't opened yet. Turns danger-red while actually live.
export function LivesBell() {
  const { settings, badge } = useLive();
  const isLive = settings?.isLive ?? false;

  return (
    <PressableScale
      onPress={() => router.push("/lives")}
      style={styles.button}
      accessibilityLabel={
        isLive ? "البث المباشر جارٍ الآن" : "البث المباشر القادم"
      }
    >
      <Icon
        name="bell"
        size={20}
        color={isLive ? colors.danger : colors.text}
      />
      {badge > 0 && (
        <View style={[styles.badge, isLive && styles.badgeLive]}>
          <Text style={[styles.badgeText, isLive && styles.badgeTextLive]}>
            {badge}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    left: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.lessons,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLive: { backgroundColor: colors.danger },
  badgeText: { fontFamily: font.extraBold, fontSize: 11, color: colors.onAccent },
  badgeTextLive: { color: colors.text },
});
