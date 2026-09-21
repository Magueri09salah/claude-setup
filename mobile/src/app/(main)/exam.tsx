import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { listSeries, type LicenceCategory, type SeriesRow } from "@/db";
import { Icon } from "@/components/Icon";
import { LICENCE_TITLE } from "@/licence";
import { bestScoresBySeries, type BestScore } from "@/db/attempts";
import { downloadedCountsBySeries } from "@/db/questions";
import { runSync } from "@/sync/engine";
import { useSyncStatus } from "@/sync/useSyncStatus";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

const CATEGORIES: LicenceCategory[] = ["B", "A", "C", "D"];

export default function ExamListScreen() {
  // ?category=A|C|D shows that licence's series; no param = car (B).
  const params = useLocalSearchParams<{ category?: string }>();
  const category: LicenceCategory = CATEGORIES.includes(
    params.category as LicenceCategory,
  )
    ? (params.category as LicenceCategory)
    : "B";

  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [ready, setReady] = useState<Map<number, number>>(new Map());
  const [best, setBest] = useState<Map<number, BestScore>>(new Map());
  const [retryOffline, setRetryOffline] = useState(false);
  const sync = useSyncStatus();

  const readContent = useCallback(() => {
    setSeries(listSeries(category));
    setReady(downloadedCountsBySeries());
  }, [category]);

  // Re-read on focus so a new best score shows right after finishing a quiz.
  useFocusEffect(
    useCallback(() => {
      readContent();
      setBest(bestScoresBySeries());
    }, [readContent]),
  );

  // A sync (e.g. right after the owner grants access and publishes) unlocks
  // series and downloads their files in the background. Re-read on every
  // progress tick so each card fills up live, and once more when it ends.
  useEffect(() => {
    readContent();
    // A new attempt is under way — an old "no connection" no longer applies.
    if (sync.running) setRetryOffline(false);
  }, [sync, readContent]);

  const open = (s: SeriesRow) => {
    router.push(s.locked === 1 ? "/unlock" : `/quiz/${s.id}`);
  };

  // An incomplete series resumes its download from its own card: the engine
  // skips every file already on disk, so this only fetches what is missing.
  const retry = async () => {
    setRetryOffline(false);
    const result = await runSync();
    setRetryOffline(result === "offline");
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>
            {LICENCE_TITLE[category]}
          </Text>
        </View>

        {series.length === 0 ? (
          <Text style={styles.empty}>
            لا يوجد محتوى بعد — عد إلى الرئيسية واضغط "تحديث".
          </Text>
        ) : (
          series.map((s) => {
            const locked = s.locked === 1;
            const readyCount = ready.get(s.id) ?? 0;
            // Owner rule (2026-09-21): a series opens only at 40/40. The quiz
            // plays downloaded questions only, so a partial one would be a
            // short, broken exam. While a sync runs the card shows a loader;
            // if the sync ended short (lost connection), tapping resumes it.
            const incomplete = !locked && readyCount < s.question_count;
            const loading = incomplete && sync.running;
            const score = best.get(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => (incomplete ? void retry() : open(s))}
                disabled={loading}
                accessibilityState={{ busy: loading, disabled: loading }}
                style={({ pressed }) => [
                  styles.card,
                  locked && styles.lockedCard,
                  pressed && !locked && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {locked ? (
                  <View style={styles.lockChip}>
                    <Icon name="lock" size={13} color={colors.premium} />
                    <Text style={styles.lockChipText}>مقفل</Text>
                  </View>
                ) : incomplete ? (
                  <View style={styles.left}>
                    {loading ? (
                      <ActivityIndicator size="small" color={colors.exam} />
                    ) : (
                      <Icon name="refresh" size={20} color={colors.exam} />
                    )}
                    <Text style={styles.loadingCount}>
                      {readyCount}/{s.question_count}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.left}>
                    {score ? (
                      <View
                        style={[
                          styles.scoreBadge,
                          score.passed && styles.scoreBadgePass,
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreText,
                            score.passed && styles.scoreTextPass,
                          ]}
                        >
                          {score.score}/{score.total}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.scoreBadgeEmpty}>
                        <Text style={styles.scoreEmptyText}>—</Text>
                      </View>
                    )}
                    <Text style={styles.play}>ابدأ</Text>
                  </View>
                )}
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardMeta}>
                    {locked
                      ? `${s.question_count} سؤال`
                      : loading
                        ? "جاري تحميل السلسلة…"
                        : incomplete
                          ? retryOffline
                            ? "لا يوجد اتصال — اضغط لإعادة المحاولة"
                            : "التحميل غير مكتمل — اضغط لإكماله"
                          : score
                            ? `أفضل نتيجة · ${readyCount} سؤال`
                            : `${readyCount} سؤال جاهز`}
                  </Text>
                  {incomplete && (
                    <View style={styles.track}>
                      {/* scaleX, not width: no layout pass per downloaded file */}
                      <View
                        style={[
                          styles.fill,
                          {
                            transform: [
                              {
                                scaleX:
                                  s.question_count > 0
                                    ? readyCount / s.question_count
                                    : 0,
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        {/* Car (B) only, per owner decision 2026-08-11: the mock exam draws
            random questions from every unlocked series, which would mix moto
            and truck questions into one another's exam. */}
        {category === "B" && series.length > 0 && (
          <Pressable
            onPress={() => router.push("/mock")}
            style={({ pressed }) => [
              styles.mockCard,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.mockChip}>
              <Icon name="trophy" size={24} color={colors.onAccent} />
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
    </ScreenBackground>
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
  left: { alignItems: "center", gap: space.xs, minWidth: 56 },
  play: { fontFamily: font.bold, fontSize: 14, color: colors.exam },
  loadingCount: { fontFamily: font.bold, fontSize: 13, color: colors.textDim },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    overflow: "hidden",
    marginTop: space.xs,
  },
  fill: {
    width: "100%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.exam,
    transformOrigin: "left",
  },
  scoreBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  scoreBadgePass: {
    backgroundColor: "rgba(47,191,113,0.16)",
    borderColor: colors.success,
  },
  scoreBadgeEmpty: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  scoreText: { fontFamily: font.extraBold, fontSize: 16, color: colors.text },
  scoreTextPass: { color: colors.success },
  scoreEmptyText: { fontFamily: font.bold, fontSize: 16, color: colors.textDim },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
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
