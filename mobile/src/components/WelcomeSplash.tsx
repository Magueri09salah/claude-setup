import { StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "./BrandLogo";
import { useResponsive } from "../theme/useResponsive";
import { colors, font, space } from "../theme/tokens";

/**
 * A brief branded welcome on first launch, replacing the full-screen download
 * gate (owner decision 2026-09-28).
 *
 * The first sync used to hold the whole app hostage behind a progress bar for
 * several minutes. Now it runs in the background, the home page opens straight
 * away, and each card reports its own download the way the exam series already
 * did. This screen is only a greeting — it carries NO progress, on purpose:
 * a bar here would just be the old gate with a timer on it.
 */
export function WelcomeSplash() {
  // 180 in portrait; shrinks on a short landscape screen.
  const { height } = useResponsive();
  const logoSize = Math.min(180, Math.round(height * 0.22));

  return (
    <View style={styles.screen}>
      <BrandLogo size={logoSize} style={styles.logo} />
      <Text style={styles.title}>مرحباً بك</Text>
      <Text style={styles.subtitle}>
        نحضّر لك المحتوى — يمكنك التصفح فوراً
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.sm,
  },
  logo: { marginBottom: space.lg },
  title: {
    fontFamily: font.extraBold,
    fontSize: 24,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textDim,
    textAlign: "center",
  },
});
