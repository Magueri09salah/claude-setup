import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { AnswerZone } from "@/components/quiz/AnswerZone";
import { TimerPill } from "@/components/quiz/TimerPill";
import { TimerSheet } from "@/components/quiz/TimerSheet";
import { useQuizEngine, type QuizSource } from "@/quiz/useQuizEngine";
import { colors, font, radius, space, type } from "@/theme/tokens";

// Shared quiz UI for both a normal series and the random mock exam.
export function QuizRunner({ source }: { source: QuizSource }) {
  const quiz = useQuizEngine(source);
  const { phase, question, index, total, attemptId, paused } = quiz;

  const [timerSheet, setTimerSheet] = useState(false);
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

  // Autoplay the current question's audio from its LOCAL path.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !question?.audioPath) return;
    try {
      player.replace({ uri: question.audioPath });
      player.seekTo(0);
      player.play();
    } catch {
      // silent-fail — the quiz must not break if audio can't load
    }
  }, [question?.id, question?.audioPath]);

  // Pause holds the sound too; resuming picks it back up where it stopped.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (paused) player.pause();
      else if (phase === "playing") player.play();
    } catch {
      // ignore
    }
  }, [paused, phase]);

  const replay = () => {
    const player = playerRef.current;
    if (!player || paused) return;
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
      <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.centered}>
        <Text style={styles.emptyTitle}>لا توجد أسئلة محمّلة</Text>
        <Text style={styles.emptyText}>
          عد إلى الرئيسية واضغط "تحديث" عند توفر الإنترنت لتحميل الأسئلة.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>رجوع</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (phase === "finished" || !question) {
    return <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.centered} />;
  }

  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
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
          <Pressable
            onPress={replay}
            hitSlop={10}
            style={[styles.pill, paused && styles.pillDisabled]}
            disabled={paused}
          >
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

      <View style={styles.imageWrap}>
        {question.imagePath ? (
          <Image
            source={{ uri: question.imagePath }}
            style={styles.image}
            contentFit="contain"
            transition={150}
          />
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
    </LinearGradient>
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
  pillDisabled: { opacity: 0.4 },
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
