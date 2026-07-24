import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  createWafacashPayment,
  getPaymentStatus,
  type PayStatus,
} from "@/api/payments";
import { useAuth } from "@/auth/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { runSync } from "@/sync/engine";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

interface CashPayment {
  id: string;
  code: string;
  expiresAt: string;
  amount: number;
  currency: string;
}

const STEPS = [
  "توجّه إلى أقرب وكالة Wafacash",
  "أعطِ الرمز أدناه للموظف وادفع المبلغ نقداً",
  "ارجع إلى التطبيق واضغط «تحقق من الدفع»",
];

function remainingLabel(expiresAt: string, now: number): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "انتهت صلاحية الرمز";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `صالح لمدة ${h} ساعة و${m} دقيقة`;
}

export default function WafacashScreen() {
  const { refreshUser } = useAuth();
  const [payment, setPayment] = useState<CashPayment | null>(null);
  const [status, setStatus] = useState<PayStatus | "creating" | "error">("creating");
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const created = useRef(false);

  const create = useCallback(async () => {
    setStatus("creating");
    try {
      const p = await createWafacashPayment();
      setPayment(p);
      setStatus("PENDING");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    void create();
  }, [create]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const check = useCallback(async () => {
    if (!payment) return;
    setChecking(true);
    try {
      const s = await getPaymentStatus(payment.id);
      if (s.status === "PAID") {
        await refreshUser();
        await runSync();
      }
      setStatus(s.status);
    } catch {
      // leave as-is
    } finally {
      setChecking(false);
    }
  }, [payment, refreshUser]);

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>الدفع عبر Wafacash</Text>
        </View>

        {status === "creating" && (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color={colors.lessons} />
            <Text style={styles.muted}>جارٍ إنشاء رمز الدفع…</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.centerCard}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.strong}>تعذّر إنشاء الرمز</Text>
            <PrimaryButton label="حاول مجدداً" onPress={create} />
          </View>
        )}

        {status === "PAID" && (
          <View style={styles.centerCard}>
            <Text style={styles.emoji}>✅</Text>
            <Text style={styles.strong}>تم تأكيد الدفع!</Text>
            <Text style={styles.muted}>أصبح كل المحتوى متاحاً الآن.</Text>
            <PrimaryButton label="ابدأ التعلّم" onPress={() => router.replace("/")} />
          </View>
        )}

        {status === "EXPIRED" && payment && (
          <View style={styles.centerCard}>
            <Text style={styles.emoji}>⏳</Text>
            <Text style={styles.strong}>انتهت صلاحية الرمز</Text>
            <Text style={styles.muted}>أنشئ رمزاً جديداً للمتابعة.</Text>
            <PrimaryButton label="إنشاء رمز جديد" onPress={create} />
          </View>
        )}

        {(status === "PENDING" || status === "FAILED") && payment && (
          <>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>رمز الدفع</Text>
              <Text style={styles.code}>{payment.code}</Text>
              <Text style={styles.amount}>
                {payment.amount} {payment.currency}
              </Text>
              <Text style={styles.expiry}>{remainingLabel(payment.expiresAt, now)}</Text>
            </View>

            <View style={styles.stepsCard}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            {status === "FAILED" && (
              <Text style={styles.failed}>
                لم يُسجَّل الدفع بعد — إن كنت قد دفعت انتظر قليلاً ثم تحقق مجدداً.
              </Text>
            )}

            <PrimaryButton
              label="تحقق من الدفع"
              loading={checking}
              onPress={check}
            />
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
  back: { fontFamily: font.extraBold, fontSize: 30, color: colors.text },
  title: { ...type.title, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  centerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    gap: space.md,
    ...shadow.card,
  },
  emoji: { fontSize: 48 },
  strong: { fontFamily: font.extraBold, fontSize: 20, color: colors.text, textAlign: "center" },
  muted: { ...type.body, color: colors.textDim, textAlign: "center" },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lessons,
    borderLeftWidth: 4,
    padding: space.lg,
    alignItems: "center",
    gap: space.xs,
    ...shadow.card,
  },
  codeLabel: { ...type.label, color: colors.textDim },
  code: {
    fontFamily: font.extraBold,
    fontSize: 40,
    color: colors.lessons,
    letterSpacing: 2,
  },
  amount: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  expiry: { ...type.label, color: colors.textDim, marginTop: space.xs },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: `${colors.lessons}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: font.extraBold, fontSize: 14, color: colors.lessons },
  stepText: { ...type.body, color: colors.text, flex: 1, textAlign: "right" },
  failed: { ...type.label, color: colors.danger, textAlign: "center" },
});
