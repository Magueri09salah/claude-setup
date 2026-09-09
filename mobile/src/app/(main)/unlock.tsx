import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { runSync } from "@/sync/engine";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

interface Support {
  whatsappNumber: string | null;
  whatsappMessage: string;
}

const BENEFITS = [
  "كل سلاسل الامتحان كاملة",
  "جميع الدروس النظرية والعلامات",
  "الدروس التطبيقية بالفيديو",
  "تحديثات مستمرة للمحتوى",
];

const STEPS = [
  "اضغط على زر واتساب بالأسفل",
  "أرسل الرسالة الجاهزة كما هي — تحتوي على رقمك",
  "بعد التأكيد يُفتح لك المحتوى كاملاً في نفس الحساب",
];

/** 2026-11-26 → "26/11/2026", the way the owner reads a date out loud. */
function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Whole days left, or null once it has passed. */
function remainingDays(iso: string): number | null {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

// Access is requested over WhatsApp instead of being paid for in-app (owner
// decision 2026-08-13): the admin adds the candidate's number to the allowlist
// after the conversation, and the API grants premium server-side.
export default function UnlockScreen() {
  const { user, refreshUser } = useAuth();
  const [support, setSupport] = useState<Support | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api<Support>("/content/support")
      .then(setSupport)
      .catch(() => setSupport(null));
  }, []);

  // Coming back from WhatsApp is exactly when the unlock may have landed, so
  // re-read the account instead of making the candidate hunt for a button.
  useFocusEffect(
    useCallback(() => {
      void refreshUser();
    }, [refreshUser]),
  );

  // The admin needs to know WHICH number to add — so the message carries it.
  const message = [
    support?.whatsappMessage ?? "",
    user?.username ? `اسم المستخدم: ${user.username}` : "",
    user?.phone ? `رقم الهاتف: ${user.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const openWhatsapp = () => {
    if (!support?.whatsappNumber) return;
    const url = `https://wa.me/${support.whatsappNumber}?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() =>
      Alert.alert(
        "تعذّر فتح واتساب",
        "تأكد من تثبيت تطبيق واتساب على هاتفك.",
      ),
    );
  };

  const checkNow = async () => {
    setChecking(true);
    const updated = await refreshUser();
    if (updated?.isPremium) {
      // Premium changes the manifest ETag, so this pulls the unlocked content.
      await runSync();
      Alert.alert("تم فتح المحتوى", "حسابك الآن مفتوح بالكامل. بالتوفيق!", [
        { text: "ابدأ", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(
        "لم يُفتح بعد",
        "لم يُضف رقمك بعد. إذا راسلتنا للتو فانتظر قليلاً ثم أعد المحاولة.",
      );
    }
    setChecking(false);
  };

  if (user?.isPremium) {
    return (
      <ScreenBackground style={styles.centered}>
        <Icon name="unlock" size={44} color={colors.success} />
        <Text style={styles.doneTitle}>حسابك مفتوح بالكامل</Text>
        <Text style={styles.doneText}>
          يمكنك الوصول إلى كل السلاسل والدروس.
        </Text>
        {/* The term is three months, so it must be visible — the lock should
            never arrive as a surprise mid-revision. */}
        {user?.premiumUntil && (
          <View style={styles.expiryPill}>
            <Icon name="calendar" size={15} color={colors.lessons} />
            <Text style={styles.expiryText}>
              اشتراكك صالح حتى {formatExpiry(user.premiumUntil)}
              {remainingDays(user.premiumUntil) !== null
                ? ` · ${remainingDays(user.premiumUntil)} يوم متبقٍ`
                : ""}
            </Text>
          </View>
        )}
        <PressableScale onPress={() => router.back()} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>رجوع</Text>
        </PressableScale>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>افتح المحتوى الكامل</Text>
        </View>

        <View style={styles.pitch}>
          <Icon name="unlock" size={32} color={colors.lessons} />
          <Text style={styles.pitchTitle}>اشتراك طريق المميّز</Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Icon name="check" size={16} color={colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>كيف تحصل عليه</Text>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {support === null ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.lessons} />
          </View>
        ) : support.whatsappNumber ? (
          <PressableScale onPress={openWhatsapp} style={styles.whatsapp}>
            <BrandIcon platform="WHATSAPP" size={22} color={colors.onAccent} />
            <Text style={styles.whatsappText}>تواصل معنا على واتساب</Text>
          </PressableScale>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardBody}>
              لم يُضبط رقم التواصل بعد. حاول لاحقاً أو تواصل مع مدرستك.
            </Text>
          </View>
        )}

        <PressableScale
          onPress={() => void checkNow()}
          style={styles.secondary}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <Icon name="refresh" size={16} color={colors.text} />
              <Text style={styles.secondaryText}>تحقّق من حالة حسابي</Text>
            </>
          )}
        </PressableScale>

        <Text style={styles.note}>
          يُفتح المحتوى على نفس الحساب برقم الهاتف الذي سجّلت به
          {user?.phone ? ` (${user.phone})` : ""}.
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.sm,
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  pitch: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.lessons,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  pitchTitle: { ...type.title, color: colors.text, textAlign: "right" },
  benefits: { gap: space.xs },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  benefitText: { ...type.body, fontSize: 15, color: colors.text, flex: 1, textAlign: "right" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  cardTitle: { ...type.title, fontSize: 17, color: colors.text, textAlign: "right" },
  cardBody: { ...type.body, color: colors.textDim, textAlign: "right" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: font.bold, fontSize: 13, color: colors.lessons },
  stepText: { ...type.body, fontSize: 15, color: colors.text, flex: 1, textAlign: "right" },
  whatsapp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 56,
    borderRadius: radius.pill,
    // WhatsApp brand green — this button must look like what it opens.
    backgroundColor: "#25D366",
    ...shadow.card,
  },
  whatsappText: { fontFamily: font.extraBold, fontSize: 17, color: colors.onAccent },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
  },
  secondaryText: { ...type.label, fontSize: 15, color: colors.text },
  note: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "center" },
  expiryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  expiryText: { ...type.label, fontSize: 13, color: colors.text },
  doneTitle: { ...type.title, color: colors.text, textAlign: "center" },
  doneText: { ...type.body, color: colors.textDim, textAlign: "center" },
  doneButton: {
    marginTop: space.md,
    backgroundColor: colors.series,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  doneButtonText: { fontFamily: font.bold, fontSize: 15, color: colors.onAccent },
});
