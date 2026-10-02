import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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
import { useBottomInset } from "@/theme/useScreenInsets";

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

// ANDROID ONLY — iOS never renders these, see IS_IOS below.
const STEPS = [
  "اضغط على زر واتساب بالأسفل",
  "أرسل الرسالة الجاهزة كما هي — تحتوي على رقمك",
  "بعد تأكيد الإدارة يُفتح لك المحتوى كاملاً في نفس الحساب",
];

// APP STORE GUIDELINE 3.1.1 — THE iOS SCREEN OFFERS NO WAY OUT OF THE APP.
//
// Apple's anti-steering rule forbids any button, link or instruction inside the
// app that points at an external way of obtaining paid digital content. The
// Android screen does precisely that on purpose (the STEPS list, then the
// WhatsApp button), which is the exact pattern reviewers are trained to find,
// so on iOS both are replaced by IOS_NOTICE plus «الانضمام إلى المجموعة»,
// which POSTs to our own API and never leaves the app. That is the whole
// distinction the rule turns on: asking for access is fine, being sent
// somewhere else to arrange it is not. Adding in-app purchase would NOT have
// saved the WhatsApp button — 3.1.1 is two rules and IAP answers only the
// first (owner asked, 2026-10-02).
//
// Nothing else changes. Students still reach the school on WhatsApp — they get
// the number from the school, not from the app. The allowlist, the admin panel
// and the API are untouched, and the SHOP keeps its WhatsApp button on iOS as
// well, because physical goods are exempt under 3.1.3(e).
//
// Do NOT add a contact button, a phone number, a price, or a link to /courses
// to the iOS branch — any one of them re-creates the violation. /courses may
// keep its own WhatsApp button (enrolling in real driving lessons is a
// real-world service) only as long as THIS screen never points at it. And if
// in-app purchase is ever added, this notice STAYS: IAP satisfies the first
// half of 3.1.1, not the anti-steering half.
const IS_IOS = Platform.OS === "ios";

// Not one word about paying, pricing or contacting anyone: those are what
// would re-create the violation, not the act of requesting.
const IOS_NOTICE = [
  "المحتوى الكامل متاح للمترشّحين المسجّلين في المجموعة.",
  "اضغط «الانضمام إلى المجموعة» وسيصل طلبك إلى الإدارة مباشرة.",
  "بعد قبول الطلب يُفتح المحتوى في حسابك تلقائياً.",
];

/** Mirrors GroupRequestStatus on the API. */
type JoinStatus = "PENDING" | "APPROVED" | "REJECTED";

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

// There is no purchase in this app. Full content is opened by the school: the
// candidate sends their number over WhatsApp, the admin adds it to the
// allowlist, and the API grants access server-side. Nothing here may read as a
// sale — app stores require digital purchases to go through their own billing,
// so this screen is an ENROLMENT request, not a checkout. On iOS it says even
// less than that — see the guideline 3.1.1 note above IS_IOS.
export default function UnlockScreen() {
  // Edge-to-edge: the last card would sit under Android's navigation
  // bar without this (owner report 2026-09-23).
  const paddingBottom = useBottomInset();
  const { user, refreshUser } = useAuth();
  const [support, setSupport] = useState<Support | null>(null);
  const [checking, setChecking] = useState(false);
  // iOS only. null = never asked, or asked and refused — both show the button
  // again, because a refusal the candidate cannot act on is just a dead end.
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // iOS never renders the WhatsApp button, so it has no use for the number.
    if (IS_IOS) return;
    api<Support>("/content/support")
      .then(setSupport)
      .catch(() => setSupport(null));
  }, []);

  // The button is replaced by "قيد المراجعة" once a request exists, so the
  // screen has to know which of the two to draw before it renders.
  const loadJoinStatus = useCallback(() => {
    if (!IS_IOS) return;
    api<{ request: { status: JoinStatus } | null }>("/group-requests/mine")
      .then((r) => setJoinStatus(r.request?.status ?? null))
      .catch(() => undefined); // offline is not an error on this screen
  }, []);

  // Coming back from WhatsApp (Android) is exactly when the unlock may have
  // landed, so re-read the account instead of making the candidate hunt for a
  // button. On iOS it catches an approval granted while the app sat in the
  // background, and refreshes the request's own state at the same time.
  useFocusEffect(
    useCallback(() => {
      void refreshUser();
      loadJoinStatus();
    }, [refreshUser, loadJoinStatus]),
  );

  // Records the ask and nothing else — the grant is the admin's, server-side,
  // exactly like every other premium grant in this project.
  const join = async () => {
    setJoining(true);
    try {
      const r = await api<{ request: { status: JoinStatus } }>(
        "/group-requests",
        { method: "POST", json: {} },
      );
      setJoinStatus(r.request.status);
      Alert.alert(
        "تم إرسال طلبك",
        "وصل طلبك إلى الإدارة. بعد قبوله يُفتح المحتوى في حسابك.",
      );
    } catch {
      Alert.alert(
        "تعذّر إرسال الطلب",
        "تحقق من اتصالك بالإنترنت ثم حاول مجدداً.",
      );
    }
    setJoining(false);
  };

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
        // "if you just messaged us" names an external channel, so iOS gets a
        // plain retry line instead (guideline 3.1.1).
        IS_IOS
          ? "لم يُفعّل حسابك بعد. أعد المحاولة بعد قليل."
          : "لم يُضف رقمك بعد. إذا راسلتنا للتو فانتظر قليلاً ثم أعد المحاولة.",
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
              وصولك مفتوح حتى {formatExpiry(user.premiumUntil)}
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
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>فتح المحتوى</Text>
        </View>

        <View style={styles.pitch}>
          <Icon name="unlock" size={32} color={colors.lessons} />
          <Text style={styles.pitchTitle}>المحتوى الكامل</Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Icon name="check" size={16} color={colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {IS_IOS ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>الوصول إلى المحتوى الكامل</Text>
              {IOS_NOTICE.map((line) => (
                <Text key={line} style={styles.cardBody}>
                  {line}
                </Text>
              ))}
            </View>

            {joinStatus === "PENDING" || joinStatus === "APPROVED" ? (
              <View style={[styles.card, styles.pending]}>
                <Icon name="clock" size={20} color={colors.lessons} />
                <Text style={styles.pendingText}>
                  {joinStatus === "APPROVED"
                    ? "تمت الموافقة على طلبك — اضغط «تحقّق من حالة حسابي»"
                    : "طلبك قيد المراجعة لدى الإدارة"}
                </Text>
              </View>
            ) : (
              <PressableScale
                onPress={() => void join()}
                style={styles.join}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <>
                    <Icon name="unlock" size={20} color={colors.onAccent} />
                    <Text style={styles.joinText}>الانضمام إلى المجموعة</Text>
                  </>
                )}
              </PressableScale>
            )}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>كيف تحصل على الوصول</Text>
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
                <BrandIcon
                  platform="WHATSAPP"
                  size={22}
                  color={colors.onAccent}
                />
                <Text style={styles.whatsappText}>
                  تواصل مع الإدارة عبر واتساب
                </Text>
              </PressableScale>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardBody}>
                  لم يُضبط رقم التواصل بعد. حاول لاحقاً أو تواصل مع مدرستك.
                </Text>
              </View>
            )}
          </>
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
  join: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.lessons,
    ...shadow.card,
  },
  joinText: { fontFamily: font.extraBold, fontSize: 17, color: colors.onAccent },
  // Icon first = icon on the LEFT, text right-aligned beside it: the same
  // arrangement as benefitRow above, since the app is LTR with Arabic handled
  // by textAlign (see _layout).
  pending: { flexDirection: "row", alignItems: "center" },
  pendingText: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
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
