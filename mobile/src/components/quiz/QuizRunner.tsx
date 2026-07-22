import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnswerZone } from "@/components/quiz/AnswerZone";
import { TimerPill } from "@/components/quiz/TimerPill";
import { useQuizEngine, type QuizSource } from "@/quiz/useQuizEngine";
import { colors, font, radius, space, type } from "@/theme/tokens";

// Shared quiz UI for both a normal series and the random mock exam.
export function QuizRunner({ source }: { source: QuizSource }) {
  const quiz = useQuizEngine(source);
  const { phase, question, index, total, attemptId } = quiz;

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
      try {
        player?.remove();
      } catch {
        // already released
      }
    };
  }, []);

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
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Pressable onPress={replay} hitSlop={10} style={styles.replay}>
          <Text style={styles.replayText}>🔊 إعادة</Text>
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        <TimerPill seconds={quiz.timeLeft} />
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
            contentFit="cover"
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
  close: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  replay: {
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  replayText: { ...type.label, color: colors.text },
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
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
