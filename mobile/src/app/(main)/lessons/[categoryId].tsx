import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { getCategory, listChildCategories, listLessons } from "@/db/lessons";
import { openCategory } from "@/lessons/nav";
import { accentFor } from "@/theme/lessonAccents";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

// Level 2 of 3 (owner sketch 2026-08-07): inside a category (التشوير الطرقي),
// its lessons are a 2-COLUMN PICTURE GRID — cover image on top, name beneath
// (علامات المنع / علامة الإجبار …). That cover is why lessons carry an image.
export default function CategoryScreen() {
  const params = useLocalSearchParams<{ categoryId: string }>();
  const id = Number(params.categoryId);
  const category = getCategory(id);
  const children = listChildCategories(id);
  const lessons = listLessons(id);

  return (
    <ScreenBackground style={styles.screen}>
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
                  onPress={() =>
                    locked ? router.push("/payment") : openCategory(c.id)
                  }
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
                      <Icon name="sign" size={30} color={accentFor(c.order_num)} />
                    </View>
                  )}
                  <Text style={styles.gridTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {lessons.length > 0 && (
          <View style={styles.grid}>
            {lessons.map((l) => {
              const locked = l.locked === 1;
              return (
                <PressableScale
                  key={l.id}
                  onPress={() =>
                    locked
                      ? router.push("/payment")
                      : router.push(
                          // Videos stream from their own screen; signs are the
                          // offline flashcard grid.
                          l.kind === "VIDEOS"
                            ? `/lesson/videos/${l.id}`
                            : `/lesson/${l.id}`,
                        )
                  }
                  style={[styles.gridCard, locked && styles.locked]}
                  accessibilityLabel={`${l.title} — ${l.sign_count} علامة`}
                >
                  {l.image_path ? (
                    <Image
                      source={{ uri: l.image_path }}
                      style={styles.thumb}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Icon
                        name={
                          locked ? "lock" : l.kind === "VIDEOS" ? "video" : "sign"
                        }
                        size={30}
                        color={locked ? colors.premium : colors.lessons}
                      />
                    </View>
                  )}
                  <Text style={styles.gridTitle} numberOfLines={2}>
                    {l.title}
                  </Text>
                  <Text style={styles.gridMeta}>
                    {locked
                      ? "للمشتركين فقط"
                      : l.kind === "VIDEOS"
                        ? `${l.video_count} فيديو`
                        : `${l.sign_count} علامة`}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {children.length === 0 && lessons.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>القسم فارغ حالياً</Text>
            <Text style={styles.emptyText}>سيصل المحتوى مع التحديث القادم.</Text>
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
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
    // Same rule as the sign cards: a wrapping row stretches items to the
    // tallest, and reserved text height keeps every row identical.
    justifyContent: "flex-start",
    ...shadow.card,
  },
  locked: { opacity: 0.6 },
  thumb: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  thumbFallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: {
    ...type.label,
    color: colors.text,
    textAlign: "center",
    // Two lines always reserved (numberOfLines={2} caps it), so a short name
    // and a wrapping one still give cards of the same height.
    minHeight: 2 * 20,
  },
  gridMeta: {
    ...type.label,
    fontSize: 11,
    color: colors.textDim,
    textAlign: "center",
  },
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
