import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { listTopCategories } from "@/db/lessons";
import { openCategory } from "@/lessons/nav";
import { accentFor } from "@/theme/lessonAccents";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

// الدروس النظرية — level 1 of 3 (owner sketch 2026-08-07): the categories are
// FULL-WIDTH rows (التشوير الطرقي / المركبة / الوثائق). Level 2 is where the
// 2-column picture grid starts.
export default function LessonsHomeScreen() {
  const categories = listTopCategories();

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.titleFlex]}>الدروس النظرية</Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا توجد دروس بعد</Text>
            <Text style={styles.emptyText}>
              اضغط "تحديث" في الشاشة الرئيسية عند توفر الإنترنت لتحميل الدروس.
            </Text>
          </View>
        ) : (
          categories.map((c) => {
            const locked = c.locked === 1;
            const accent = accentFor(c.order_num);
            return (
              <PressableScale
                key={c.id}
                onPress={() =>
                  locked ? router.push("/payment") : openCategory(c.id)
                }
                style={[styles.row, locked && styles.lockedRow]}
              >
                <View style={[styles.chip, { backgroundColor: `${accent}26` }]}>
                  {c.icon_path ? (
                    <Image source={{ uri: c.icon_path }} style={styles.chipImage} />
                  ) : (
                    <Icon name="sign" size={26} color={accent} />
                  )}
                </View>
                {locked && (
                  <View style={styles.lockChip}>
                    <Icon name="lock" size={13} color={colors.premium} />
                    <Text style={styles.lockChipText}>مدفوع</Text>
                  </View>
                )}
                <Text style={styles.rowTitle}>{c.title}</Text>
              </PressableScale>
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
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    ...shadow.card,
  },
  lockedRow: { opacity: 0.6 },
  chip: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipImage: { width: 56, height: 56 },
  rowTitle: { ...type.title, color: colors.text, flex: 1, textAlign: "right" },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: "rgba(255,211,72,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  lockChipText: { ...type.label, fontSize: 12, color: colors.premium },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
  },
  emptyTitle: { ...type.title, color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.textDim, textAlign: "center" },
});
