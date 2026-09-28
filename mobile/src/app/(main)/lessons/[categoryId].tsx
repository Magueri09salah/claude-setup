import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import {
  downloadedSignCountsByLesson,
  getCategory,
  listChildCategories,
  listLessons,
  signProgressByCategory,
  type DownloadState,
} from "@/db/lessons";
import { openCategory } from "@/lessons/nav";
import { gridBasis, useResponsive } from "@/theme/useResponsive";
import { accentFor } from "@/theme/lessonAccents";
import { colors, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";
import { runSync } from "@/sync/engine";
import { useSyncStatus } from "@/sync/useSyncStatus";
import { useBottomInset } from "@/theme/useScreenInsets";

// Level 2 of 3 (owner sketch 2026-08-07): inside a category (التشوير الطرقي),
// its lessons are a 2-COLUMN PICTURE GRID — cover image on top, name beneath
// (علامات المنع / علامة الإجبار …). That cover is why lessons carry an image.
export default function CategoryScreen() {
  // Edge-to-edge: the last card would sit under Android's navigation
  // bar without this (owner report 2026-09-23).
  const paddingBottom = useBottomInset();
  const { columns } = useResponsive();
  const basis = gridBasis(columns);
  const params = useLocalSearchParams<{ categoryId: string }>();
  const id = Number(params.categoryId);
  const category = getCategory(id);

  // Re-read on every sync tick so each card fills up live while the first
  // download is still running (owner decision 2026-09-28: the app opens
  // straight onto its content and the download shows up per card, exactly
  // like سلاسل الامتحان).
  const sync = useSyncStatus();
  const [children, setChildren] = useState(() => listChildCategories(id));
  const [childProgress, setChildProgress] = useState<Map<number, DownloadState>>(
    signProgressByCategory,
  );
  const [lessons, setLessons] = useState(() => listLessons(id));
  const [ready, setReady] = useState<Map<number, number>>(
    downloadedSignCountsByLesson,
  );
  const [retryOffline, setRetryOffline] = useState(false);

  const readContent = useCallback(() => {
    setChildren(listChildCategories(id));
    setChildProgress(signProgressByCategory());
    setLessons(listLessons(id));
    setReady(downloadedSignCountsByLesson());
  }, [id]);

  useFocusEffect(readContent);

  useEffect(() => {
    readContent();
    if (sync.running) setRetryOffline(false);
  }, [sync, readContent]);

  // Resumes from this card: the engine skips every file already on disk.
  const retry = async () => {
    setRetryOffline(false);
    const result = await runSync();
    setRetryOffline(result === "offline");
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>
            {category?.title ?? "الدروس"}
          </Text>
        </View>

        {children.length > 0 && (
          <View style={styles.grid}>
            {children.map((c) => {
              const locked = c.locked === 1;
              const p = childProgress.get(c.id);
              const incomplete =
                !locked && !!p && p.total > 0 && p.ready < p.total;
              const loading = incomplete && sync.running;
              return (
                <PressableScale
                  key={c.id}
                  disabled={loading}
                  onPress={() =>
                    locked
                      ? router.push("/unlock")
                      : incomplete
                        ? void retry()
                        : openCategory(c.id)
                  }
                  style={[
                    styles.gridCard,
                    { width: basis },
                    (locked || incomplete) && styles.locked,
                  ]}
                  accessibilityState={{ busy: loading, disabled: loading }}
                >
                  {c.icon_path && !incomplete ? (
                    <Image source={{ uri: c.icon_path }} style={styles.thumb} />
                  ) : (
                    <View
                      style={[
                        styles.thumb,
                        styles.thumbFallback,
                        { backgroundColor: `${accentFor(c.order_num)}26` },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator
                          size="small"
                          color={accentFor(c.order_num)}
                        />
                      ) : (
                        <Icon
                          name={incomplete ? "refresh" : "sign"}
                          size={30}
                          color={accentFor(c.order_num)}
                        />
                      )}
                    </View>
                  )}
                  <Text style={styles.gridTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                  {incomplete && p && (
                    <Text style={styles.gridMeta}>
                      {loading
                        ? `جاري التحميل… ${p.ready}/${p.total}`
                        : `اضغط لإكمال التحميل · ${p.ready}/${p.total}`}
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        )}

        {lessons.length > 0 && (
          <View style={styles.grid}>
            {lessons.map((l) => {
              const locked = l.locked === 1;
              const readyCount = ready.get(l.id) ?? 0;
              // VIDEOS lessons stream, so there is nothing to wait for. A
              // SIGNS lesson opens only once every sign is on disk.
              const incomplete =
                !locked && l.kind === "SIGNS" && readyCount < l.sign_count;
              const loading = incomplete && sync.running;
              return (
                <PressableScale
                  key={l.id}
                  disabled={loading}
                  onPress={() =>
                    locked
                      ? router.push("/unlock")
                      : incomplete
                        ? void retry()
                        : router.push(
                            // Videos stream from their own screen; signs are
                            // the offline flashcard grid.
                            l.kind === "VIDEOS"
                              ? `/lesson/videos/${l.id}`
                              : `/lesson/${l.id}`,
                          )
                  }
                  style={[
                    styles.gridCard,
                    { width: basis },
                    (locked || incomplete) && styles.locked,
                  ]}
                  accessibilityState={{ busy: loading, disabled: loading }}
                  accessibilityLabel={`${l.title} — ${l.sign_count} علامة`}
                >
                  {l.image_path && !incomplete ? (
                    <Image
                      source={{ uri: l.image_path }}
                      style={styles.thumb}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      {loading ? (
                        <ActivityIndicator size="small" color={colors.lessons} />
                      ) : (
                        <Icon
                          name={
                            locked
                              ? "lock"
                              : incomplete
                                ? "refresh"
                                : l.kind === "VIDEOS"
                                  ? "video"
                                  : "sign"
                          }
                          size={30}
                          color={locked ? colors.premium : colors.lessons}
                        />
                      )}
                    </View>
                  )}
                  <Text style={styles.gridTitle} numberOfLines={2}>
                    {l.title}
                  </Text>
                  <Text style={styles.gridMeta}>
                    {locked
                      ? "يتطلب تفعيل الحساب"
                      : loading
                        ? `جاري التحميل… ${readyCount}/${l.sign_count}`
                        : incomplete
                          ? retryOffline
                            ? "لا يوجد اتصال — اضغط لإعادة المحاولة"
                            : `اضغط لإكمال التحميل · ${readyCount}/${l.sign_count}`
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
  title: { ...type.display, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  gridCard: {
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
