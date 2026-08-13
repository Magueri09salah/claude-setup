import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { ImageViewer } from "@/components/ImageViewer";
import { AnswerZone } from "@/components/quiz/AnswerZone";
import { TimerPill } from "@/components/quiz/TimerPill";
import { TimerSheet } from "@/components/quiz/TimerSheet";
import { useQuizEngine, type QuizSource } from "@/quiz/useQuizEngine";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { ScreenBackground } from "../ScreenBackground";

// Shared quiz UI for both a normal series and the random mock exam.
export function QuizRunner({ source }: { source: QuizSource }) {
  const quiz = useQuizEngine(source);
  const { phase, question, index, total, attemptId, paused, audioFinished } =
    quiz;

  const [timerSheet, setTimerSheet] = useState(false);
  const [viewer, setViewer] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  // One reusable player for the whole quiz; swap the source per question.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(null);
      playerRef.current = player;
    } catch {
      playerRef.current = null;
    }
    return () => {
      playerRef.current = null;
      try {
        // pause() first: releasing alone does not reliably cut playback that is
        // already in flight, which left the question audio running after the
        // screen was gone.
        player?.pause();
        player?.remove();
      } catch {
        // already released
      }
    };
  }, []);

  // Leaving the screen (back, or anything pushed on top) must silence it, even
  // while the component stays mounted in the navigator.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          playerRef.current?.pause();
        } catch {
          // ignore
        }
      };
    }, []),
  );

  // Autoplay the current question's audio from its LOCAL path, and tell the
  // engine when it ends — the countdown only starts after the reading.
  useEffect(() => {
    const player = playerRef.current;
    // No audio at all: nothing to wait for, start the timer immediately.
    if (!player || !question?.audioPath) {
      audioFinished();
      return;
    }
    try {
      player.replace({ uri: question.audioPath });
      player.seekTo(0);
      player.play();
    } catch {
      // The quiz must not stall on a missing or corrupt file.
      audioFinished();
    }
  }, [question?.id, question?.audioPath, audioFinished]);

  // expo-audio has no "ended" callback on the imperative player, so poll the
  // status while a question is being read. Cheap: it stops as soon as the
  // reading is done, and the interval is idle for the rest of the question.
  useEffect(() => {
    if (phase !== "playing" || !quiz.waitingForAudio) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        audioFinished();
        return;
      }
      try {
        const { currentTime, duration, playing } = player;
        // duration is 0 until the file is loaded — don't call it finished then.
        if (duration > 0 && !playing && currentTime >= duration - 0.15) {
          audioFinished();
        }
      } catch {
        audioFinished();
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, quiz.waitingForAudio, question?.id, audioFinished]);

  const replay = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // ignore
    }
  };

  // When finished, hand off to results.
  useEffect(() => {
    if (phase === "finished" && attemptId) {
      router.replace(`/results?attemptId=${attemptId}`);
    }
  }, [phase, attemptId]);

  if (phase === "empty") {
    return (
      <ScreenBackground style={styles.centered}>
        <Text style={styles.emptyTitle}>لا توجد أسئلة محمّلة</Text>
        <Text style={styles.emptyText}>
          عد إلى الرئيسية واضغط "تحديث" عند توفر الإنترنت لتحميل الأسئلة.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>رجوع</Text>
        </Pressable>
      </ScreenBackground>
    );
  }

  if (phase === "finished" || !question) {
    return <ScreenBackground style={styles.centered} />;
  }

  return (
    <ScreenBackground style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={quiz.togglePause}
            hitSlop={10}
            style={[styles.pill, paused && styles.pillActive]}
            accessibilityRole="button"
            accessibilityLabel={paused ? "استئناف" : "إيقاف مؤقت"}
          >
            <Icon
              name={paused ? "play" : "pause"}
              size={16}
              color={paused ? colors.onAccent : colors.text}
            />
            <Text style={[styles.pillText, paused && styles.pillTextActive]}>
              {paused ? "استئناف" : "إيقاف"}
            </Text>
          </Pressable>
          <Pressable onPress={replay} hitSlop={10} style={styles.pill}>
            <Icon name="volume" size={16} color={colors.text} />
            <Text style={styles.pillText}>إعادة</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statusRow}>
        <TimerPill
          seconds={quiz.timeLeft}
          total={quiz.questionSeconds}
          onPress={() => setTimerSheet(true)}
        />
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {index + 1} / {total}
          </Text>
        </View>
      </View>

      {/* A frozen clock looks broken unless you say why it is frozen. */}
      {quiz.waitingForAudio && (
        <View style={styles.hintRow}>
          <Icon name="volume" size={13} color={colors.textDim} />
          <Text style={styles.hintText}>
            يبدأ العد بعد انتهاء قراءة السؤال
          </Text>
        </View>
      )}

      <View style={styles.imageWrap}>
        {question.imagePath ? (
          <Pressable
            onPress={() => setViewer(true)}
            accessibilityRole="button"
            accessibilityLabel="تكبير الصورة"
          >
            <Image
              source={{ uri: question.imagePath }}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
            <View style={styles.zoomBadge}>
              <Icon name="zoom" size={16} color={colors.text} />
            </View>
          </Pressable>
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}
      </View>

      <View style={styles.answerArea}>
        <AnswerZone
          answersCount={question.answersCount}
          selected={quiz.selected}
          onToggle={quiz.toggle}
          onConfirm={quiz.confirm}
          onSkip={quiz.skip}
        />
      </View>

      <TimerSheet
        visible={timerSheet}
        onClose={() => setTimerSheet(false)}
      />

      {/* Exam pictures carry small Arabic text — zoom and landscape make them
          readable without leaving the question. */}
      <ImageViewer
        uri={question.imagePath}
        visible={viewer}
        onClose={() => setViewer(false)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: space.xxl,
    paddingHorizontal: space.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  topActions: { flexDirection: "row", gap: space.sm },
  pill: {
    flexDirection: "row",
    gap: space.xs,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: colors.lessons },
  pillText: { ...type.label, color: colors.text },
  pillTextActive: { color: colors.onAccent },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  chip: {
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.sm,
  },
  hintText: { ...type.label, fontSize: 12, color: colors.textDim },
  imageWrap: { marginTop: space.md, flex: 1, justifyContent: "center" },
  // Exam images carry Arabic text — always fit the WHOLE image (contain), never
  // crop. The surface behind fills any letterboxing.
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: "100%",
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { ...type.label, color: colors.textDim },
  zoomBadge: {
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
  answerArea: { paddingVertical: space.lg },
  emptyTitle: { ...type.title, color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.textDim, textAlign: "center" },
  emptyButton: {
    marginTop: space.md,
    paddingHorizontal: space.xl,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.series,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: { fontFamily: font.bold, fontSize: 16, color: colors.onAccent },
});
