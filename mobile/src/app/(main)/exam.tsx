import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listSeries, type SeriesRow } from "@/db";
import { countDownloaded } from "@/db/questions";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

export default function ExamListScreen() {
  const series = listSeries();

  const open = (s: SeriesRow) => {
    router.push(s.locked === 1 ? "/payment" : `/quiz/${s.id}`);
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>سلاسل الامتحان</Text>
        </View>

        {series.length === 0 ? (
          <Text style={styles.empty}>
            لا يوجد محتوى بعد — عد إلى الرئيسية واضغط "تحديث".
          </Text>
        ) : (
          series.map((s) => {
            const locked = s.locked === 1;
            const ready = countDownloaded(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => open(s)}
                style={({ pressed }) => [
                  styles.card,
                  locked && styles.lockedCard,
                  pressed && !locked && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {locked ? (
                  <View style={styles.lockChip}>
                    <Text style={styles.lockChipText}>🔒 مدفوع</Text>
                  </View>
                ) : (
                  <Text style={styles.play}>ابدأ</Text>
                )}
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardMeta}>
                    {locked ? `${s.question_count} سؤال` : `${ready} سؤال جاهز`}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {series.length > 0 && (
          <Pressable
            onPress={() => router.push("/mock")}
            style={({ pressed }) => [
              styles.mockCard,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.mockChip}>
              <Text style={styles.mockTrophy}>🏆</Text>
            </View>
            <View style={styles.cardTexts}>
              <Text style={styles.mockTitle}>امتحان تجريبي</Text>
              <Text style={styles.mockSubtitle}>
                أسئلة عشوائية من كل السلاسل — اختبر مهاراتك
              </Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  back: { fontFamily: font.extraBold, fontSize: 30, color: colors.text },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  empty: { ...type.body, color: colors.textDim, marginTop: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow.card,
  },
  lockedCard: { opacity: 0.6 },
  cardTexts: { gap: 2, flex: 1 },
  cardTitle: { ...type.title, color: colors.text, textAlign: "right" },
  cardMeta: { ...type.label, color: colors.textDim, textAlign: "right" },
  play: { fontFamily: font.bold, fontSize: 16, color: colors.exam },
  lockChip: {
    backgroundColor: "rgba(255,211,72,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  lockChipText: { ...type.label, fontSize: 12, color: colors.premium },
  mockCard: {
    backgroundColor: colors.lessons,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.sm,
    ...shadow.card,
  },
  mockChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  mockTrophy: { fontSize: 22 },
  mockTitle: {
    fontFamily: font.extraBold,
    fontSize: 20,
    color: colors.onAccent,
    textAlign: "right",
  },
  mockSubtitle: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.onAccentDim,
    textAlign: "right",
  },
});
