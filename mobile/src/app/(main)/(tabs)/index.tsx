import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  const { logout } = useAuth();
  const [hasContent, setHasContent] = useState(() => hasLocalContent());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
        {/* Owner layout (2026-09-26): bell on the RIGHT, refresh on the LEFT,
            no greeting, and signing out moved behind the menu button so a
            mis-tap can no longer end the session. */}
        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            <Pressable
              onPress={() => void doSync()}
              disabled={syncing}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="تحديث المحتوى"
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Icon name="refresh" size={18} color={colors.text} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="القائمة"
            >
              <Icon name="menu" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={[styles.headerSide, styles.headerEnd]}>
            <LivesBell />
          </View>
        </View>

        <Text style={styles.title}>القائمة الرئيسية</Text>

        <View style={styles.cards}>
          {/* Car, not the traffic light: this is the B-licence series list, and
              the owner wants the vehicle to say so (decision 2026-09-23). */}
          <FeatureCard
            title="سلاسل الامتحان"
            subtitle="40 سؤالاً في كل سلسلة، مثل الامتحان الرسمي"
            icon="car"
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
              card per vehicle on a screen of its own. Its badge is the three
              licence letters rather than a car, which now belongs to the first
              card (owner decision 2026-09-23). */}
          <FeatureCard
            title="الشاحنة، الحافلة، الدراجة"
            subtitle="تدرّب حسب صنف رخصة السياقة"
            letters={["A", "C", "D"]}
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
          {/* Lead generation: the candidate picks their city and reaches the
              school on WhatsApp; the request lands in the admin panel. */}
          <FeatureCard
            title="حجز حصة سياقة"
            subtitle="اختر مدينتك وتواصل معنا"
            icon="school"
            accent={colors.series}
            onPress={() => router.push("/courses")}
          />
          <FeatureCard
            title="المتجر"
            subtitle="منتجات مدرسة السياقة"
            icon="store"
            accent={colors.lessons}
            onPress={() => router.push("/shop")}
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

      {/* One item today, but a sheet rather than an inline button: the only
          action in it signs the candidate out, and that deserves a deliberate
          second tap. */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuOpen(false)}
        supportedOrientations={["portrait", "landscape"]}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          {/* Stops a tap INSIDE the card from closing it. */}
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void logout();
              }}
              style={styles.menuItem}
              accessibilityRole="button"
            >
              <Icon name="logout" size={20} color={colors.danger} />
              <Text style={styles.menuItemText}>تسجيل الخروج</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Capped so the menu cards stay a readable width on a landscape tablet
  // instead of stretching the full 1000pt.
  content: {
    padding: space.lg,
    paddingTop: space.xxl,
    gap: space.md,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headerEnd: { justifyContent: "flex-end" },
  title: {
    ...type.display,
    color: colors.text,
    textAlign: "right",
    marginTop: space.sm,
  },
  cards: { gap: space.md },
  liveBlock: { marginTop: space.lg },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-start",
    padding: space.lg,
    paddingTop: space.xxl * 2,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 56,
  },
  menuItemText: { ...type.title, fontSize: 16, color: colors.danger },
  syncProgress: { ...type.label, color: colors.textDim, textAlign: "right" },
  offline: { ...type.label, color: colors.text, textAlign: "right" },
  empty: {
    ...type.body,
    color: colors.textDim,
    textAlign: "right",
    marginTop: space.sm,
  },
});
