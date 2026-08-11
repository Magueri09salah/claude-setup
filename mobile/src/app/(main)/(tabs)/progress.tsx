import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { listSeries } from "@/db";
import { listAttempts } from "@/db/attempts";
import { computeProgress } from "@/quiz/progressStats";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

export default function ProgressScreen() {
  const attempts = listAttempts();
  const series = listSeries();
  const titleOf = (id: number) =>
    id === 0
      ? "امتحان تجريبي"
      : (series.find((s) => s.id === id)?.title ?? `سلسلة ${id}`);
  const progress = computeProgress(attempts, titleOf);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ar-MA", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.titleFlex]}>تقدّمي</Text>
        </View>

        {progress.totalAttempts === 0 ? (
          <Text style={styles.empty}>
            لم تُنجز أي امتحان بعد. ابدأ سلسلة امتحان لتظهر نتائجك هنا.
          </Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {Math.round(progress.overallPassRate * 100)}%
                </Text>
                <Text style={styles.summaryLabel}>نسبة النجاح</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{progress.totalAttempts}</Text>
                <Text style={styles.summaryLabel}>عدد المحاولات</Text>
              </View>
            </View>

            <Text style={styles.section}>أضعف السلاسل</Text>
            {progress.weakest.map((s) => (
              <View key={s.seriesId} style={styles.row}>
                <Text style={styles.rowMeta}>
                  أفضل نتيجة {s.bestScore}/{s.bestTotal}
                </Text>
                <Text style={styles.rowTitle}>{s.title}</Text>
              </View>
            ))}

            <Text style={styles.section}>حسب السلسلة</Text>
            {progress.perSeries.map((s) => (
              <View key={s.seriesId} style={styles.row}>
                <Text
                  style={[
                    styles.rowScore,
                    { color: s.lastPassed ? colors.success : colors.text },
                  ]}
                >
                  {s.bestScore}/{s.bestTotal}
                </Text>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>{s.title}</Text>
                  <Text style={styles.rowMeta}>
                    {s.attemptCount} محاولة · آخر نتيجة{" "}
                    {s.lastPassed ? "ناجح" : "راسب"}
                  </Text>
                </View>
              </View>
            ))}

            <Text style={styles.section}>السجل</Text>
            {progress.history.map((a) => (
              <View key={a.id} style={styles.row}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: a.passed
                        ? "rgba(47,191,113,0.18)"
                        : "rgba(229,72,77,0.18)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: a.passed ? colors.success : colors.danger },
                    ]}
                  >
                    {a.score}/{a.total}
                  </Text>
                </View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>{titleOf(a.seriesId)}</Text>
                  <Text style={styles.rowMeta}>{fmtDate(a.finishedAt)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  empty: { ...type.body, color: colors.textDim, marginTop: space.md },
  summaryRow: { flexDirection: "row", gap: space.md },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    ...shadow.card,
  },
  summaryValue: { fontFamily: font.extraBold, fontSize: 34, color: colors.text },
  summaryLabel: { ...type.label, color: colors.textDim },
  section: {
    ...type.title,
    color: colors.text,
    textAlign: "right",
    marginTop: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
  },
  rowTexts: { flex: 1, gap: 2 },
  rowTitle: { ...type.body, color: colors.text, textAlign: "right" },
  rowMeta: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
  rowScore: { fontFamily: font.extraBold, fontSize: 18 },
  badge: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: font.bold, fontSize: 14 },
});
