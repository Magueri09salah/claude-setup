import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { createOnlinePayment, getPaymentStatus } from "@/api/payments";
import { useAuth } from "@/auth/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { runSync } from "@/sync/engine";
import { colors, font, radius, space, type } from "@/theme/tokens";

type Phase = "idle" | "opening" | "polling" | "paid" | "unconfirmed" | "error";

export default function OnlinePaymentScreen() {
  const { refreshUser } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const paymentId = useRef<string | null>(null);

  // Poll status every 2s up to 60s after the gateway page closes.
  const poll = useCallback(async (id: string) => {
    setPhase("polling");
    for (let i = 0; i < 30; i++) {
      try {
        const s = await getPaymentStatus(id);
        if (s.status === "PAID") {
          await refreshUser();
          await runSync();
          setPhase("paid");
          return;
        }
        if (s.status === "FAILED" || s.status === "EXPIRED") break;
      } catch {
        // keep trying
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPhase("unconfirmed");
  }, [refreshUser]);

  const start = useCallback(async () => {
    setPhase("opening");
    try {
      const { id, redirectUrl } = await createOnlinePayment();
      paymentId.current = id;
      await WebBrowser.openBrowserAsync(redirectUrl);
      await poll(id);
    } catch {
      setPhase("error");
    }
  }, [poll]);

  const retry = useCallback(() => {
    if (paymentId.current) void poll(paymentId.current);
    else void start();
  }, [poll, start]);

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <View style={styles.content}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backWrap}
        >
          <Text style={styles.back}>‹ رجوع</Text>
        </Pressable>

        <View style={styles.center}>
          {phase === "polling" || phase === "opening" ? (
            <>
              <ActivityIndicator size="large" color={colors.lessons} />
              <Text style={styles.status}>
                {phase === "opening"
                  ? "جارٍ فتح صفحة الدفع…"
                  : "جارٍ تأكيد الدفع…"}
              </Text>
            </>
          ) : phase === "paid" ? (
            <>
              <Text style={styles.emoji}>✅</Text>
              <Text style={styles.statusStrong}>تم تفعيل اشتراكك!</Text>
              <Text style={styles.status}>أصبح كل المحتوى متاحاً الآن.</Text>
              <View style={styles.actions}>
                <PrimaryButton
                  label="ابدأ التعلّم"
                  onPress={() => router.replace("/")}
                />
              </View>
            </>
          ) : phase === "unconfirmed" ? (
            <>
              <Text style={styles.emoji}>⏳</Text>
              <Text style={styles.statusStrong}>لم يتم تأكيد الدفع بعد</Text>
              <Text style={styles.status}>
                إذا أكملت الدفع، اضغط "تحقق مرة أخرى".
              </Text>
              <View style={styles.actions}>
                <PrimaryButton label="تحقق مرة أخرى" onPress={retry} />
              </View>
            </>
          ) : phase === "error" ? (
            <>
              <Text style={styles.emoji}>⚠️</Text>
              <Text style={styles.statusStrong}>تعذّر بدء الدفع</Text>
              <Text style={styles.status}>تحقق من اتصالك وحاول مجدداً.</Text>
              <View style={styles.actions}>
                <PrimaryButton label="حاول مجدداً" onPress={start} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>💳</Text>
              <Text style={styles.statusStrong}>الدفع بالبطاقة البنكية</Text>
              <Text style={styles.status}>
                ستُفتح صفحة دفع آمنة. بعد إتمام الدفع عد إلى التطبيق.
              </Text>
              <View style={styles.actions}>
                <PrimaryButton label="متابعة الدفع" onPress={start} />
              </View>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: space.lg, paddingTop: space.xxl },
  backWrap: { alignSelf: "flex-start" },
  back: { ...type.label, color: colors.textDim },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    paddingBottom: space.xxl,
  },
  emoji: { fontSize: 56 },
  statusStrong: {
    fontFamily: font.extraBold,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
  },
  status: { ...type.body, color: colors.textDim, textAlign: "center" },
  actions: { width: "100%", marginTop: space.md, gap: space.sm },
});
