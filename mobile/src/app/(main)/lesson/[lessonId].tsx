import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "@/components/PressableScale";
import { getLesson, listSigns, type SignRow } from "@/db/lessons";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";

// Lesson = a 2-column grid of sign flashcards (image + Arabic name + audio),
// per owner decision 2026-07-22. Tapping a card plays its audio explanation
// from the LOCAL path; one shared player, swapped per sign.
export default function LessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string }>();
  const id = Number(params.lessonId);
  const lesson = getLesson(id);
  const signs = listSigns(id);

  const [activeId, setActiveId] = useState<number | null>(null);
  const active = signs.find((s) => s.id === activeId) ?? null;
  const player = useAudioPlayer(active?.audio_path ? { uri: active.audio_path } : null);
  const status = useAudioPlayerStatus(player);

  // Auto-play whenever the active sign changes.
  useEffect(() => {
    if (active?.audio_path) {
      player.seekTo(0);
      player.play();
    }
  }, [active?.id, active?.audio_path, player]);

  const onCardPress = (sign: SignRow) => {
    if (!sign.audio_path) return;
    if (sign.id === activeId) {
      if (status.playing) player.pause();
      else {
        if (status.duration > 0 && status.currentTime >= status.duration - 0.05) {
          player.seekTo(0);
        }
        player.play();
      }
    } else {
      setActiveId(sign.id);
    }
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>
            {lesson?.title ?? "الدرس"}
          </Text>
        </View>

        {signs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا توجد علامات بعد</Text>
            <Text style={styles.emptyText}>
              هذا الدرس قيد الإعداد — عد إليه بعد التحديث القادم.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {signs.map((s) => {
              const isActive = s.id === activeId;
              const playing = isActive && status.playing;
              const hasAudio = !!s.audio_path;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => onCardPress(s)}
                  style={[styles.card, isActive && styles.cardActive]}
                >
                  <View style={styles.imageWrap}>
                    {s.image_path ? (
                      <Image
                        source={{ uri: s.image_path }}
                        style={styles.image}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.image, styles.imageMissing]}>
                        <Text style={styles.missingText}>—</Text>
                      </View>
                    )}
                    {hasAudio && (
                      <View style={styles.playBadge}>
                        <Text style={styles.playIcon}>{playing ? "⏸" : "▶"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.signName} numberOfLines={2}>
                    {s.name}
                  </Text>
                </PressableScale>
              );
            })}
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
  title: { ...type.title, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: space.sm,
    ...shadow.card,
  },
  cardActive: { borderColor: colors.lessons, borderWidth: 2 },
  imageWrap: { position: "relative" },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
  },
  imageMissing: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  missingText: { ...type.title, color: colors.textDim },
  playBadge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,25,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 14, color: "#FFFFFF" },
  signName: {
    ...type.label,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
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
