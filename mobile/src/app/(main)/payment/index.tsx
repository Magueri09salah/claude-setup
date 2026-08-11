import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { getPricing, type Pricing } from "@/api/payments";
import { PressableScale } from "@/components/PressableScale";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

const BENEFITS = [
  "كل سلاسل الامتحان كاملة",
  "جميع الدروس النظرية والعلامات",
  "تحديثات مستمرة للمحتوى",
];

export default function PaymentIndexScreen() {
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    getPricing()
      .then(setPricing)
      .catch(() => setPricing(null));
  }, []);

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>افتح المحتوى الكامل</Text>
        </View>

        <View style={styles.pitch}>
          <Icon name="unlock" size={32} color={colors.lessons} style={styles.pitchIcon} />
          <Text style={styles.pitchTitle}>اشتراك طريق المميّز</Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Icon name="check" size={16} color={colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {pricing ? `${pricing.amount} ${pricing.currency}` : "…"}
            </Text>
            <Text style={styles.priceLabel}>{pricing?.label ?? ""}</Text>
          </View>
        </View>

        <Text style={styles.chooseLabel}>اختر طريقة الدفع</Text>

        <PressableScale
          onPress={() => router.push("/payment/online")}
          style={[styles.option, { borderLeftColor: colors.exam }]}
        >
          <View style={[styles.optIcon, { backgroundColor: `${colors.exam}26` }]}>
            <Icon name="card" size={24} color={colors.exam} />
          </View>
          <View style={styles.optTexts}>
            <Text style={styles.optTitle}>الدفع بالبطاقة البنكية</Text>
            <Text style={styles.optSub}>فيزا / ماستركارد — تفعيل فوري</Text>
          </View>
        </PressableScale>

        <PressableScale
          onPress={() => router.push("/payment/wafacash")}
          style={[styles.option, { borderLeftColor: colors.lessons }]}
        >
          <View style={[styles.optIcon, { backgroundColor: `${colors.lessons}26` }]}>
            <Icon name="store" size={24} color={colors.lessons} />
          </View>
          <View style={styles.optTexts}>
            <Text style={styles.optTitle}>الدفع نقداً في وكالة Wafacash</Text>
            <Text style={styles.optSub}>تحصل على رمز تدفعه في أقرب وكالة</Text>
          </View>
        </PressableScale>
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
  pitch: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    ...shadow.card,
  },
  pitchIcon: { alignSelf: "center" },
  pitchTitle: {
    ...type.title,
    color: colors.text,
    textAlign: "center",
  },
  benefits: { gap: space.sm, marginTop: space.sm },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  benefitText: { ...type.body, color: colors.text, flex: 1, textAlign: "right" },
  priceRow: {
    alignItems: "center",
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  price: { fontFamily: font.extraBold, fontSize: 40, color: colors.lessons },
  priceLabel: { ...type.label, color: colors.textDim },
  chooseLabel: {
    ...type.label,
    color: colors.textDim,
    textAlign: "right",
    marginTop: space.sm,
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    ...shadow.card,
  },
  optIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optTexts: { flex: 1, gap: 2 },
  optTitle: { ...type.title, fontSize: 17, color: colors.text, textAlign: "right" },
  optSub: { ...type.label, color: colors.textDim, textAlign: "right" },
});
