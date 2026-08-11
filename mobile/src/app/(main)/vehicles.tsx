import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { seriesCountByCategory, type LicenceCategory } from "@/db";
import { LICENCES } from "@/licence";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

// Licence categories other than the car (B), which has its own entry on home
// as سلاسل الامتحان.
const EXTRA: LicenceCategory[] = ["A", "D", "C"];

const SUBTITLE: Record<LicenceCategory, string> = {
  B: "رخصة السيارة — الصنف B",
  A: "رخصة الدراجة النارية — الصنف A",
  C: "رخصة الشاحنة — الصنف C",
  D: "رخصة الحافلة — الصنف D",
};

// One card per licence. Tapping a card opens that licence's own series list;
// a licence with no series yet stays visible but inert, so the candidate can
// see it is coming without hitting an empty screen.
export default function VehiclesScreen() {
  const [counts, setCounts] = useState<Map<LicenceCategory, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      setCounts(seriesCountByCategory());
    }, []),
  );

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>سلاسل الدروس</Text>
        </View>

        <Text style={styles.hint}>اختر صنف رخصة السياقة</Text>

        {EXTRA.map((value) => {
          const meta = LICENCES.find((l) => l.value === value)!;
          const count = counts.get(value) ?? 0;
          const ready = count > 0;
          return (
            <PressableScale
              key={value}
              onPress={
                ready ? () => router.push(`/exam?category=${value}`) : undefined
              }
              disabled={!ready}
              style={[styles.card, !ready && styles.cardEmpty]}
              accessibilityLabel={`${meta.label} — ${
                ready ? `${count} سلسلة` : "لا توجد سلاسل بعد"
              }`}
            >
              <View style={styles.chip}>
                <Icon
                  name={meta.icon}
                  size={28}
                  color={ready ? colors.series : colors.textDim}
                />
              </View>
              <View style={styles.texts}>
                <Text style={styles.cardTitle}>{meta.label}</Text>
                <Text style={styles.cardSub}>{SUBTITLE[value]}</Text>
              </View>
              <View style={[styles.badge, ready && styles.badgeReady]}>
                <Text style={[styles.badgeText, ready && styles.badgeTextReady]}>
                  {ready ? `${count} سلسلة` : "قريباً"}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  hint: { ...type.label, color: colors.textDim, textAlign: "right" },
  // Controls/icons LEFT, Arabic text right-aligned (ui-design §5).
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.series,
    padding: space.lg,
    ...shadow.card,
  },
  cardEmpty: { borderLeftColor: colors.border, opacity: 0.55 },
  chip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, gap: 2 },
  cardTitle: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.text,
    textAlign: "right",
  },
  cardSub: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
  badge: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  badgeReady: { backgroundColor: "rgba(47,191,113,0.16)" },
  badgeText: { ...type.label, fontSize: 11, color: colors.textDim },
  badgeTextReady: { color: colors.series },
});
