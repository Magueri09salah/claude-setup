import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { PressableScale } from "@/components/PressableScale";
import { countPassedAttempts, getAttempt } from "@/db/attempts";
import { colors, font, radius, space, type } from "@/theme/tokens";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const LANE_DASHES = 10;

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ attemptId: string }>();
  const attempt = params.attemptId ? getAttempt(params.attemptId) : null;

  if (!attempt) {
    return (
      <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.centered}>
        <Text style={[styles.verdictText, { color: colors.text }]}>
          تعذّر تحميل النتيجة
        </Text>
        <PressableScale
          onPress={() => router.replace("/")}
          style={[styles.actionButton, styles.errorHome, { backgroundColor: colors.lessons }]}
        >
          <Text style={styles.actionText}>الرئيسية</Text>
        </PressableScale>
      </LinearGradient>
    );
  }

  // The lane-paint moment: only on the FIRST ever pass of this series.
  const firstPass =
    attempt.passed &&
    attempt.seriesId > 0 &&
    countPassedAttempts(attempt.seriesId) === 1;

  const share = () => {
    void Share.share({
      message: `حصلت على ${attempt.score}/${attempt.total} في تطبيق طريق لتعليم السياقة 🚦`,
    });
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>
          النتيجة{" "}
          <Text style={{ color: attempt.passed ? colors.success : colors.danger }}>
            {attempt.score}/{attempt.total}
          </Text>
        </Text>

        {firstPass && (
          <View style={styles.lane}>
            {Array.from({ length: LANE_DASHES }, (_, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.delay(150 + i * 70).duration(150)}
                style={styles.laneDash}
              />
            ))}
          </View>
        )}

        <View
          style={[
            styles.verdict,
            {
              backgroundColor: attempt.passed
                ? "rgba(47,191,113,0.18)"
                : "rgba(229,72,77,0.18)",
            },
          ]}
        >
          <Icon
            name={attempt.passed ? "checkCircle" : "closeCircle"}
            size={18}
            color={attempt.passed ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.verdictText,
              { color: attempt.passed ? colors.success : colors.danger },
            ]}
          >
            {attempt.passed ? "ناجح" : "راسب"}
          </Text>
        </View>

        <View style={styles.grid}>
          {attempt.details.map((r, i) => {
            const tint = r.isCorrect ? colors.success : colors.danger;
            return (
              <Animated.View
                key={r.questionId}
                entering={FadeInDown.delay(Math.min(i * 30, 750))
                  .duration(250)
                  .easing(EASE_OUT)}
                style={styles.tileWrap}
              >
                <PressableScale
                  onPress={() =>
                    router.push(`/review?attemptId=${attempt.id}&q=${i}`)
                  }
                  style={[styles.tile, { borderColor: tint }]}
                >
                  <Text style={[styles.tileNumber, { color: tint }]}>
                    {r.order}
                  </Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <PressableScale
            onPress={() => router.replace("/")}
            style={[styles.actionButton, { backgroundColor: colors.lessons }]}
          >
            <Icon name="home" size={18} color={colors.onAccent} />
            <Text style={styles.actionText}>العودة للرئيسية</Text>
          </PressableScale>
          <PressableScale
            onPress={share}
            style={[styles.actionButton, styles.actionSecondary]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>
              ↗ مشاركة النتيجة
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  heading: {
    ...type.display,
    color: colors.text,
    textAlign: "center",
  },
  lane: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  laneDash: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lessons,
  },
  verdict: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    alignSelf: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  verdictText: { fontFamily: font.extraBold, fontSize: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    justifyContent: "flex-start",
    marginTop: space.md,
  },
  tileWrap: { width: "18%" },
  // Signal-light tile: dark surface, colored ring + numeral (readable in both
  // states, unlike white-on-green fills).
  tile: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileNumber: { fontFamily: font.extraBold, fontSize: 22 },
  actions: { gap: space.md, marginTop: space.xl },
  actionButton: {
    flexDirection: "row",
    gap: space.sm,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { fontFamily: font.bold, fontSize: 16, color: colors.onAccent },
  errorHome: { paddingHorizontal: space.xl },
});
