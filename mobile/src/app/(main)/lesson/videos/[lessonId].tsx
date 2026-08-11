import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ApiLessonVideo } from "@/api/types";
import { getLessonVideos } from "@/api/videos";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { getLesson } from "@/db/lessons";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

function sizeLabel(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} غ.ب` : `${Math.round(mb)} م.ب`;
}

// Video lesson (المركبة). Unlike the sign grid, videos are STREAMED: they are
// far too large to sit in the offline bundle, so this screen needs a connection
// and says so plainly when there isn't one.
export default function VideoLessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string }>();
  const id = Number(params.lessonId);
  const lesson = getLesson(id);

  const [videos, setVideos] = useState<ApiLessonVideo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const active = videos?.find((v) => v.id === activeId) ?? null;
  const player = useVideoPlayer(active?.url ?? null, (p) => {
    p.play();
  });

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const r = await getLessonVideos(id);
      setVideos(r.videos);
    } catch {
      setVideos(null);
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>
            {lesson?.title ?? "الدرس"}
          </Text>
        </View>

        {active && (
          <View style={styles.playerCard}>
            <VideoView
              player={player}
              style={styles.player}
              contentFit="contain"
              allowsFullscreen
              nativeControls
            />
            <Text style={styles.playerTitle}>{active.title}</Text>
          </View>
        )}

        {videos === null && !failed && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.lessons} />
            <Text style={styles.stateText}>جارٍ تحميل الفيديوهات…</Text>
          </View>
        )}

        {failed && (
          <View style={styles.stateCard}>
            <Icon name="alert" size={30} color={colors.textDim} />
            <Text style={styles.stateTitle}>تعذّر تحميل الفيديوهات</Text>
            <Text style={styles.stateText}>
              الفيديوهات تحتاج اتصالاً بالإنترنت — تحقق من الاتصال وحاول مجدداً.
            </Text>
            <PressableScale onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </PressableScale>
          </View>
        )}

        {videos?.length === 0 && (
          <View style={styles.stateCard}>
            <Icon name="video" size={30} color={colors.textDim} />
            <Text style={styles.stateTitle}>لا توجد فيديوهات بعد</Text>
            <Text style={styles.stateText}>سيصل المحتوى مع التحديث القادم.</Text>
          </View>
        )}

        {videos?.map((v, i) => {
          const isActive = v.id === activeId;
          const size = sizeLabel(v.sizeBytes);
          return (
            <PressableScale
              key={v.id}
              onPress={() => setActiveId(v.id)}
              style={[styles.row, isActive && styles.rowActive]}
            >
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Icon
                  name={isActive ? "play" : "video"}
                  size={18}
                  color={isActive ? colors.onAccent : colors.lessons}
                />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {v.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {size ? `الفيديو ${i + 1} · ${size}` : `الفيديو ${i + 1}`}
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
  title: { ...type.title, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
  player: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000000" },
  playerTitle: {
    ...type.label,
    color: colors.text,
    textAlign: "right",
    padding: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    ...shadow.card,
  },
  rowActive: { borderColor: colors.lessons },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,211,72,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: { backgroundColor: colors.lessons },
  rowTexts: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text, textAlign: "right" },
  rowMeta: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "right" },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
    ...shadow.card,
  },
  stateTitle: { ...type.title, color: colors.text, textAlign: "center" },
  stateText: { ...type.body, color: colors.textDim, textAlign: "center" },
  retry: {
    marginTop: space.xs,
    backgroundColor: colors.lessons,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  retryText: { fontFamily: font.bold, fontSize: 14, color: colors.onAccent },
});
