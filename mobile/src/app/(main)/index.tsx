import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { FeatureCard } from "@/components/FeatureCard";
import { FirstSyncScreen } from "@/components/FirstSyncScreen";
import { listSeries, type SeriesRow } from "@/db";
import {
  hasLocalContent,
  runSync,
  type SyncProgress,
  type SyncResult,
} from "@/sync/engine";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [series, setSeries] = useState<SeriesRow[]>(() => listSeries());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const firstLaunch = !hasLocalContent();

  const doSync = useCallback(async () => {
    setSyncing(true);
    setProgress(null);
    const result = await runSync(setProgress);
    setSeries(listSeries());
    setLastResult(result);
    setSyncing(false);
  }, []);

  // Cold-start trigger.
  useEffect(() => {
    void doSync();
  }, [doSync]);

  if (firstLaunch && syncing) {
    return <FirstSyncScreen progress={progress} />;
  }

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerTexts}>
            <Text style={styles.hello}>أهلاً 👋</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <Pressable onPress={() => void logout()} hitSlop={8}>
            <Text style={styles.logout}>خروج</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>القائمة الرئيسية</Text>

        <View style={styles.cards}>
          <FeatureCard
            title="سلاسل الامتحان"
            subtitle="40 سؤالاً في كل سلسلة، مثل الامتحان الرسمي"
            emoji="🚦"
            accent={colors.exam}
          />
          <FeatureCard
            title="الدروس النظرية"
            subtitle="قواعد السير مشروحة بالدارجة"
            emoji="📖"
            accent={colors.lessons}
          />
          <FeatureCard
            title="سلاسل الدروس"
            subtitle="تدرّب موضوعاً بموضوع"
            emoji="🚗"
            accent={colors.series}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>السلاسل</Text>
          <Pressable
            onPress={() => void doSync()}
            disabled={syncing}
            style={styles.syncButton}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.textOnDark} />
            ) : (
              <Text style={styles.syncLabel}>تحديث ⟳</Text>
            )}
          </Pressable>
        </View>

        {syncing && progress?.phase === "media" && progress.total > 0 && (
          <Text style={styles.syncProgress}>
            تحميل الملفات… {progress.done}/{progress.total}
          </Text>
        )}
        {!syncing && lastResult === "offline" && (
          <Text style={styles.offline}>
            لا يوجد اتصال — يتم عرض المحتوى المحفوظ
          </Text>
        )}

        {series.length === 0 ? (
          <Text style={styles.empty}>
            لا يوجد محتوى بعد — اضغط "تحديث" عندما يتوفر اتصال بالإنترنت.
          </Text>
        ) : (
          series.map((s) => {
            const locked = s.locked === 1;
            return (
              <View key={s.id} style={[styles.seriesCard, locked && styles.lockedCard]}>
                <View style={styles.seriesTexts}>
                  <Text style={styles.seriesTitle}>{s.title}</Text>
                  <Text style={styles.seriesMeta}>{s.question_count} سؤال</Text>
                </View>
                {locked ? (
                  <View style={styles.lockChip}>
                    <Text style={styles.lockChipText}>🔒 افتح المحتوى الكامل</Text>
                  </View>
                ) : (
                  <Text style={styles.seriesChevron}>‹</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTexts: { gap: 2 },
  hello: { ...type.label, color: colors.textOnDarkDim, textAlign: "left" },
  email: { ...type.label, color: colors.textOnDark, textAlign: "left" },
  logout: { ...type.label, color: colors.danger },
  title: {
    ...type.display,
    color: colors.textOnDark,
    textAlign: "left",
    marginTop: space.sm,
  },
  cards: { gap: space.md },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
  },
  sectionTitle: { ...type.title, color: colors.textOnDark, textAlign: "left" },
  syncButton: {
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  syncLabel: { ...type.label, color: colors.textOnDark },
  syncProgress: { ...type.label, color: colors.textOnDarkDim, textAlign: "left" },
  offline: { ...type.label, color: colors.lessons, textAlign: "left" },
  empty: {
    ...type.body,
    color: colors.textOnDarkDim,
    textAlign: "left",
    marginTop: space.sm,
  },
  seriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow.card,
  },
  lockedCard: { opacity: 0.6 },
  seriesTexts: { gap: 2, flex: 1 },
  seriesTitle: { ...type.title, color: colors.text, textAlign: "left" },
  seriesMeta: { ...type.label, color: colors.textDim, textAlign: "left" },
  seriesChevron: {
    fontFamily: font.extraBold,
    fontSize: 24,
    color: colors.textDim,
  },
  lockChip: {
    backgroundColor: "rgba(142,91,232,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  lockChipText: { ...type.label, fontSize: 12, color: colors.premium },
});
