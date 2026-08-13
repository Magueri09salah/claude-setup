import { router } from "expo-router";
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
import { Icon } from "@/components/Icon";
import { LiveSection } from "@/components/LiveSection";
import { LivesBell } from "@/components/LivesBell";
import {
  hasLocalContent,
  runSync,
  type SyncProgress,
  type SyncResult,
} from "@/sync/engine";
import { colors, radius, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [hasContent, setHasContent] = useState(() => hasLocalContent());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const firstLaunch = !hasContent;

  const doSync = useCallback(async () => {
    setSyncing(true);
    setProgress(null);
    const result = await runSync(setProgress);
    setHasContent(hasLocalContent());
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
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerActions}>
            {/* Sync lives here now that the duplicate series list (and the
                section header that used to hold it) is gone. */}
            <Pressable
              onPress={() => void doSync()}
              disabled={syncing}
              style={styles.syncButton}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Icon name="refresh" size={18} color={colors.text} />
              )}
            </Pressable>
            <LivesBell />
            <Pressable onPress={() => void logout()} hitSlop={8}>
              <Text style={styles.logout}>خروج</Text>
            </Pressable>
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.hello}>أهلاً 👋</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>القائمة الرئيسية</Text>

        <View style={styles.cards}>
          <FeatureCard
            title="سلاسل الامتحان"
            subtitle="40 سؤالاً في كل سلسلة، مثل الامتحان الرسمي"
            icon="exam"
            accent={colors.exam}
            onPress={() => router.push("/exam")}
          />
          <FeatureCard
            title="الدروس النظرية"
            subtitle="قواعد السير مشروحة بالدارجة"
            icon="lessons"
            accent={colors.lessons}
            onPress={() => router.push("/lessons")}
          />
          {/* Third card opens its own page of licence cards (moto / bus /
              truck) — the tiles used to sit inline here, but the owner wants a
              card per vehicle on a screen of its own. */}
          <FeatureCard
            title="سلاسل الدروس"
            subtitle="تدرّب حسب صنف رخصة السياقة"
            icon="car"
            accent={colors.series}
            onPress={() => router.push("/vehicles")}
          />
          <FeatureCard
            title="الدروس التطبيقية"
            subtitle="فيديوهات السياقة العملية"
            icon="video"
            accent={colors.exam}
            onPress={() => router.push("/practical")}
          />
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
        {!syncing && !hasContent && (
          <Text style={styles.empty}>
            لا يوجد محتوى بعد — اضغط زر التحديث عندما يتوفر اتصال بالإنترنت.
          </Text>
        )}

        {/* The series list lives on /exam — home only routes to it, so the
            owner's layout has the daily live as the section under the menu. */}
        <View style={styles.liveBlock}>
          <LiveSection />
        </View>
      </ScrollView>
    </ScreenBackground>
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
  hello: { ...type.label, color: colors.textDim, textAlign: "right" },
  email: { ...type.label, color: colors.text, textAlign: "right" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: space.md },
  logout: { ...type.label, color: colors.danger },
  title: {
    ...type.display,
    color: colors.text,
    textAlign: "right",
    marginTop: space.sm,
  },
  cards: { gap: space.md },
  liveBlock: { marginTop: space.lg },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  syncProgress: { ...type.label, color: colors.textDim, textAlign: "right" },
  offline: { ...type.label, color: colors.text, textAlign: "right" },
  empty: {
    ...type.body,
    color: colors.textDim,
    textAlign: "right",
    marginTop: space.sm,
  },
});
