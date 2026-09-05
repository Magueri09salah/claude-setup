import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePausedOnBlur } from "@/audio/usePausedOnBlur";
import { gridBasis, useResponsive } from "@/theme/useResponsive";
import { Icon } from "@/components/Icon";
import { ImageViewer } from "@/components/ImageViewer";
import { ProgressBorder } from "@/components/lessons/ProgressBorder";
import { PressableScale } from "@/components/PressableScale";
import { getLesson, listSigns, type SignRow } from "@/db/lessons";
import { colors, font, radius, shadow, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

const AUDIO_TICK_MS = 100;

// Lesson = a 2-column grid of sign flashcards (image + Arabic name + audio),
// per owner decision 2026-07-22. Tapping a card plays its audio explanation
// from the LOCAL path; one shared player, swapped per sign. The playing card's
// border fills as the audio advances (owner request 2026-08-07).
export default function LessonScreen() {
  const { columns } = useResponsive();
  const basis = gridBasis(columns);
  const params = useLocalSearchParams<{ lessonId: string }>();
  const id = Number(params.lessonId);
  const lesson = getLesson(id);
  const signs = listSigns(id);

  const [activeId, setActiveId] = useState<number | null>(null);
  // Long-press opens the sign full screen: a plain tap already plays its audio,
  // so zoom needs its own gesture rather than stealing that one.
  const [zoomed, setZoomed] = useState<SignRow | null>(null);
  const active = signs.find((s) => s.id === activeId) ?? null;
  // 100ms ticks so the card's border sweeps smoothly rather than stepping.
  const player = useAudioPlayer(
    active?.audio_path ? { uri: active.audio_path } : null,
    { updateInterval: AUDIO_TICK_MS },
  );
  const status = useAudioPlayerStatus(player);
  // Fraction of the explanation already played — drives the border fill.
  const progress =
    status.duration > 0
      ? Math.min(1, status.currentTime / status.duration)
      : 0;
  // Same rule as the quiz: leaving the screen silences it.
  usePausedOnBlur(player);

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
    <ScreenBackground style={styles.screen}>
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
                <ProgressBorder
                  key={s.id}
                  active={isActive}
                  progress={progress}
                  radius={radius.lg}
                  stepMs={AUDIO_TICK_MS}
                  style={[styles.cardWrap, { width: basis }]}
                >
                  <PressableScale
                    onPress={() => onCardPress(s)}
                    onLongPress={() => setZoomed(s)}
                    style={styles.card}
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
                          <Icon
                            name={playing ? "pause" : "play"}
                            size={15}
                            color={colors.text}
                          />
                        </View>
                      )}
                    </View>
                    <Text style={styles.signName} numberOfLines={2}>
                      {s.name}
                    </Text>
                  </PressableScale>
                </ProgressBorder>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ImageViewer
        uri={zoomed?.image_path ?? null}
        title={zoomed?.name}
        visible={zoomed !== null}
        onClose={() => setZoomed(null)}
      />
    </ScreenBackground>
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
  // Width comes from useResponsive at render time — the app rotates, so a
  // hard-coded 2-column basis would give absurdly wide cards in landscape.
  cardWrap: { flexGrow: 1 },
  card: {
    // Fill the wrapper: a wrapping flex row stretches every item to the tallest
    // in its line, so without this the card floated short inside a tall box and
    // the progress border drew around the empty space below it.
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: space.sm,
    ...shadow.card,
  },
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
  signName: {
    ...type.label,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
    // Always reserve two lines (numberOfLines caps it at two), so a one-word
    // name and a wrapping one produce cards of identical height.
    minHeight: 2 * 20 + space.xs,
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
