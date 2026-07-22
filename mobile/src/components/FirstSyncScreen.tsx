import { StyleSheet, Text, View } from "react-native";
import type { SyncProgress } from "../sync/engine";
import { colors, font, radius, space } from "../theme/tokens";

// First-launch full-screen progress: "جاري تحميل المحتوى… 45/120".
export function FirstSyncScreen({ progress }: { progress: SyncProgress | null }) {
  const phaseLabel =
    progress?.phase === "media"
      ? "تحميل الصور والأصوات"
      : progress?.phase === "data"
        ? "تحميل الأسئلة"
        : "جارٍ التحقق من المحتوى";
  const ratio =
    progress && progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <View style={styles.screen}>
      <Text style={styles.logo}>طريق</Text>
      <Text style={styles.title}>جاري تحميل المحتوى لأول مرة…</Text>
      <Text style={styles.phase}>{phaseLabel}</Text>
      <View style={styles.track}>
        {/* scaleX transform instead of width: no layout work per tick */}
        <View style={[styles.fill, { transform: [{ scaleX: ratio }] }]} />
      </View>
      {progress && progress.phase === "media" && progress.total > 0 && (
        <Text style={styles.counter}>
          {progress.done}/{progress.total}
        </Text>
      )}
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
    gap: space.md,
  },
  logo: {
    fontFamily: font.extraBold,
    fontSize: 44,
    color: colors.lessons,
    marginBottom: space.lg,
  },
  title: {
    fontFamily: font.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  phase: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textDim,
  },
  track: {
    width: "100%",
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    overflow: "hidden",
    marginTop: space.sm,
  },
  fill: {
    width: "100%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.lessons,
    transformOrigin: "left",
  },
  counter: {
    fontFamily: font.extraBold,
    fontSize: 22,
    color: colors.text,
  },
});
