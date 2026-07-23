import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "@/components/PressableScale";
import { getCategory, listChildCategories, listLessons } from "@/db/lessons";
import { openCategory } from "@/lessons/nav";
import { accentFor } from "@/theme/lessonAccents";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

// Category page: sub-categories as a 2-column thumbnail grid + lessons list
// (ui-design §8). Consistent thumbnail aspect so rows never jump.
export default function CategoryScreen() {
  const params = useLocalSearchParams<{ categoryId: string }>();
  const id = Number(params.categoryId);
  const category = getCategory(id);
  const children = listChildCategories(id);
  const lessons = listLessons(id);

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>
            {category?.title ?? "الدروس"}
          </Text>
        </View>

        {children.length > 0 && (
          <View style={styles.grid}>
            {children.map((c) => {
              const locked = c.locked === 1;
              return (
                <PressableScale
                  key={c.id}
                  disabled={locked}
                  onPress={() => openCategory(c.id)}
                  style={[styles.gridCard, locked && styles.locked]}
                >
                  {c.icon_path ? (
                    <Image source={{ uri: c.icon_path }} style={styles.thumb} />
                  ) : (
                    <View
                      style={[
                        styles.thumb,
                        styles.thumbFallback,
                        { backgroundColor: `${accentFor(c.order_num)}26` },
                      ]}
                    >
                      <Text style={styles.thumbEmoji}>🚧</Text>
                    </View>
                  )}
                  <Text style={styles.gridTitle}>
                    {locked ? "🔒 " : ""}
                    {c.title}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {lessons.map((l) => {
          const locked = l.locked === 1;
          return (
            <PressableScale
              key={l.id}
              disabled={locked}
              onPress={() => router.push(`/lesson/${l.id}`)}
              style={[styles.lessonRow, locked && styles.locked]}
            >
              <View style={styles.lessonChip}>
                <Text style={styles.lessonEmoji}>📖</Text>
              </View>
              <View style={styles.lessonTexts}>
                <Text style={styles.lessonTitle}>{l.title}</Text>
                <Text style={styles.lessonMeta}>
                  {locked ? "🔒 للمشتركين" : `${l.sign_count} علامة`}
                </Text>
              </View>
            </PressableScale>
          );
        })}

        {children.length === 0 && lessons.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>القسم فارغ حالياً</Text>
            <Text style={styles.emptyText}>سيصل المحتوى مع التحديث القادم.</Text>
          </View>
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
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  gridCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
    ...shadow.card,
  },
  locked: { opacity: 0.6 },
  thumb: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 32 },
  gridTitle: {
    ...type.label,
    color: colors.text,
    textAlign: "center",
  },
  lessonRow: {
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
  lessonChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: `${colors.lessons}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonEmoji: { fontSize: 20 },
  lessonTexts: { flex: 1, gap: 2 },
  lessonTitle: { ...type.title, color: colors.text, textAlign: "right" },
  lessonMeta: { ...type.label, color: colors.textDim, textAlign: "right" },
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
