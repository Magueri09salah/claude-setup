import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { PressableScale } from "@/components/PressableScale";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TimerChoiceList } from "@/components/quiz/TimerChoiceList";
import { sendTestLocalNotification } from "@/notifications/push";
import { useQuestionSeconds } from "@/quiz/timerPref";
import { lastSyncError, wipeAndResync, type SyncProgress } from "@/sync/engine";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [seconds, setSeconds] = useQuestionSeconds();
  const [repairing, setRepairing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  // Required by Google Play and the App Store: an account created in the app
  // must be deletable from inside the app. Two taps, both explicit, because it
  // cannot be undone.
  const deleteAccount = () => {
    Alert.alert(
      "حذف الحساب نهائياً",
      "سيُحذف حسابك وكل نتائجك وطلباتك بشكل نهائي. لا يمكن التراجع عن هذه العملية.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف حسابي",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await api("/auth/me", { method: "DELETE" });
                // The account is gone, so the session must go with it.
                await logout();
              } catch {
                setDeleting(false);
                Alert.alert(
                  "تعذّر حذف الحساب",
                  "تأكد من اتصالك بالإنترنت ثم أعد المحاولة.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const repair = () => {
    Alert.alert(
      "إعادة تحميل المحتوى",
      "سيتم حذف المحتوى المحفوظ على الجهاز وإعادة تحميله بالكامل. نتائجك محفوظة ولن تتأثر. تأكد من وجود اتصال بالإنترنت.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إعادة التحميل",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setRepairing(true);
              setProgress(null);
              const result = await wipeAndResync(setProgress);
              setRepairing(false);
              setProgress(null);
              // "offline" is the engine's catch-all, so it covers a real
              // network drop AND a fault inside the app. Showing the message
              // means the next bug like this is readable from the phone rather
              // than needing a USB cable.
              const reason = lastSyncError();
              Alert.alert(
                result === "synced"
                  ? "تم بنجاح"
                  : result === "offline"
                    ? "تعذّر التحميل"
                    : "اكتمل جزئياً",
                result === "synced"
                  ? "أُعيد تحميل كل المحتوى."
                  : result === "offline"
                    ? `تعذّر إتمام التحميل — تحقق من الاتصال وحاول لاحقاً.${
                        reason ? `\n\n(${reason})` : ""
                      }`
                    : "بقيت بعض الملفات — اضغط تحديث لاحقاً لإكمالها.",
              );
            })();
          },
        },
      ],
    );
  };

  const testNotification = () => {
    void (async () => {
      const ok = await sendTestLocalNotification();
      if (!ok) {
        Alert.alert(
          "الإشعارات غير مفعّلة",
          "فعّل الإشعارات لهذا التطبيق من إعدادات الهاتف ثم حاول مجدداً.",
        );
      }
    })();
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.titleFlex]}>الإعدادات</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>الحساب</Text>
          <Text style={styles.fullName}>
            {user?.username ?? user?.fullName ?? user?.email}
          </Text>
          {/* The phone is the login identifier now, so show it here. */}
          {user?.phone ? <Text style={styles.email}>{user.phone}</Text> : null}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                user?.isPremium ? styles.badgePremium : styles.badgeFree,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  user?.isPremium ? styles.badgeTextPremium : styles.badgeTextFree,
                ]}
              >
                {user?.isPremium ? "مفعّل" : "غير مفعّل"}
              </Text>
            </View>
          </View>
          {!user?.isPremium && (
            <PressableScale
              onPress={() => router.push("/unlock")}
              style={styles.upsell}
            >
              <Text style={styles.upsellText}>افتح المحتوى الكامل ←</Text>
            </PressableScale>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>الاختبار</Text>
          <Text style={styles.cardTitle}>مدة كل سؤال</Text>
          <Text style={styles.cardBody}>
            نفس الإعداد المتاح داخل الاختبار عند الضغط على المؤقت. تُطبَّق المدة
            الجديدة ابتداءً من السؤال التالي.
          </Text>
          <TimerChoiceList value={seconds} onChange={setSeconds} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>المحتوى</Text>
          <Text style={styles.cardTitle}>إعادة تحميل المحتوى</Text>
          <Text style={styles.cardBody}>
            إذا كانت الصور أو الأصوات لا تظهر بشكل صحيح، أعد تحميل كل المحتوى من
            جديد. لن تفقد نتائجك.
          </Text>
          {repairing && progress && (
            <Text style={styles.progressText}>
              {progress.phase === "media"
                ? `تحميل الملفات… ${progress.done}/${progress.total}`
                : progress.phase === "data"
                  ? "تحميل البيانات…"
                  : "جارٍ التحقق…"}
            </Text>
          )}
          <PrimaryButton
            label="إعادة تحميل المحتوى"
            loading={repairing}
            onPress={repair}
          />
        </View>

        {__DEV__ && (
          <View style={[styles.card, styles.devCard]}>
            <Text style={styles.cardLabel}>أدوات المطوّر (DEV)</Text>
            <Text style={styles.cardBody}>
              إشعار محلي تجريبي بنفس شكل إشعار البث المباشر — اضغط عليه للتحقق من
              فتح صفحة البث.
            </Text>
            <PressableScale onPress={testNotification} style={styles.devButton}>
              <Icon name="bell" size={16} color={colors.text} />
              <Text style={styles.devButtonText}>إرسال إشعار تجريبي</Text>
            </PressableScale>
          </View>
        )}

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardLabel}>الحساب</Text>
          <Text style={styles.cardTitle}>حذف الحساب</Text>
          <Text style={styles.cardBody}>
            حذف نهائي لحسابك ولكل بياناتك من الخادم. لا يمكن التراجع، وستحتاج
            إلى التسجيل من جديد إذا أردت العودة.
          </Text>
          <PressableScale
            onPress={deleteAccount}
            disabled={deleting}
            style={styles.dangerButton}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Icon name="alert" size={16} color={colors.danger} />
                <Text style={styles.dangerButtonText}>حذف حسابي نهائياً</Text>
              </>
            )}
          </PressableScale>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  dangerCard: { borderColor: "rgba(229,72,77,0.35)" },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { fontFamily: font.bold, fontSize: 15, color: colors.danger },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  devCard: { borderLeftWidth: 4, borderLeftColor: colors.exam },
  cardLabel: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
  cardTitle: { ...type.title, fontSize: 18, color: colors.text, textAlign: "right" },
  cardBody: { ...type.body, fontSize: 14, color: colors.textDim, textAlign: "right" },
  fullName: { ...type.title, fontSize: 18, color: colors.text, textAlign: "right" },
  email: { ...type.label, color: colors.textDim, textAlign: "right" },
  badgeRow: { flexDirection: "row" },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  badgePremium: { backgroundColor: "rgba(255,211,72,0.18)" },
  badgeFree: { backgroundColor: colors.chipBg },
  badgeText: { ...type.label, fontSize: 12 },
  badgeTextPremium: { color: colors.lessons },
  badgeTextFree: { color: colors.textDim },
  upsell: {
    marginTop: space.xs,
    backgroundColor: colors.lessons,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  upsellText: { fontFamily: font.bold, fontSize: 14, color: colors.onAccent },
  progressText: { ...type.label, color: colors.textDim, textAlign: "right" },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: colors.chipBg,
    borderRadius: radius.pill,
    paddingVertical: space.md,
  },
  devButtonText: { fontFamily: font.bold, fontSize: 15, color: colors.text },
});
