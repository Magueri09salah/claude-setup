import { Image } from "expo-image";
import { router } from "expo-router";
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
import { api } from "@/api/client";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { gridBasis, useResponsive } from "@/theme/useResponsive";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

interface PracticalVideo {
  id: number;
  orderNum: number;
  title: string;
  sizeBytes: number | null;
  url: string;
  thumbUrl: string | null;
}

function sizeLabel(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} غ.ب` : `${Math.round(mb)} م.ب`;
}

// الدروس التطبيقية — a flat list of practical-driving videos as cards, opened
// straight from home. Streamed like the lesson videos, so this screen needs a
// connection and says so plainly when there isn't one.
export default function PracticalScreen() {
  const { columns, isWide } = useResponsive();
  const basis = gridBasis(columns);
  const [videos, setVideos] = useState<PracticalVideo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const active = videos?.find((v) => v.id === activeId) ?? null;
  const player = useVideoPlayer(active?.url ?? null, (p) => {
    p.play();
  });

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const r = await api<{ videos: PracticalVideo[] }>(
        "/content/practical-videos",
      );
      setVideos(r.videos);
    } catch {
      setVideos(null);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Icon name="back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>الدروس التطبيقية</Text>
        </View>

        {active && (
          <View style={[styles.playerCard, isWide && styles.playerCardWide]}>
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
              الدروس التطبيقية تحتاج اتصالاً بالإنترنت — تحقق من الاتصال وحاول
              مجدداً.
            </Text>
            <PressableScale onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </PressableScale>
          </View>
        )}

        {videos?.length === 0 && (
          <View style={styles.stateCard}>
            <Icon name="video" size={30} color={colors.textDim} />
            <Text style={styles.stateTitle}>لا توجد دروس تطبيقية بعد</Text>
            <Text style={styles.stateText}>سيصل المحتوى قريباً.</Text>
          </View>
        )}

        <View style={styles.grid}>
          {videos?.map((v, i) => {
            const isActive = v.id === activeId;
            const size = sizeLabel(v.sizeBytes);
            return (
              <PressableScale
                key={v.id}
                onPress={() => setActiveId(v.id)}
                style={[styles.card, { width: basis }, isActive && styles.cardActive]}
                accessibilityLabel={`${v.title} — الدرس ${i + 1}`}
              >
                <View style={styles.thumbWrap}>
                  {v.thumbUrl ? (
                    <Image
                      source={{ uri: v.thumbUrl }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Icon name="video" size={28} color={colors.lessons} />
                    </View>
                  )}
                  <View style={styles.playBadge}>
                    <Icon
                      name={isActive ? "pause" : "play"}
                      size={16}
                      color={colors.text}
                    />
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {v.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {size ? `الدرس ${i + 1} · ${size}` : `الدرس ${i + 1}`}
                </Text>
              </PressableScale>
            );
          })}
        </View>
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
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
  player: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000000" },
  // A 16:9 player across a full tablet width pushes the list off-screen.
  playerCardWide: { alignSelf: "center", width: "70%" },
  playerTitle: {
    ...type.label,
    color: colors.text,
    textAlign: "right",
    padding: space.md,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  card: {
    flexGrow: 1,
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: space.sm,
    ...shadow.card,
  },
  cardActive: { borderColor: colors.lessons },
  thumbWrap: { position: "relative" },
  thumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  playBadge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    // Two lines reserved so every card is the same height.
    minHeight: 2 * 20,
  },
  cardMeta: {
    ...type.label,
    fontSize: 11,
    color: colors.textDim,
    textAlign: "center",
  },
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
