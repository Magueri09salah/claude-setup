import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { usePausedOnBlur } from "@/audio/usePausedOnBlur";
import { Icon } from "@/components/Icon";
import { ImageViewer } from "@/components/ImageViewer";
import { ZoomableImage } from "@/components/ZoomableImage";
import { AnswerButton, type AnswerVisual } from "@/components/quiz/AnswerButton";
import { getAttempt } from "@/db/attempts";
import { getQuestionById } from "@/db/questions";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useBottomInset } from "@/theme/useScreenInsets";

// The question being read aloud and the trainer explaining the answer are two
// different recordings on the same screen. Only one may play at a time, so the
// screen — not the buttons — owns which one that is.
type AudioOwner = "question" | "correction";

export default function ReviewScreen() {
  // Edge-to-edge: the last card would sit under Android's navigation
  // bar without this (owner report 2026-09-23).
  const paddingBottom = useBottomInset();
  const [viewer, setViewer] = useState(false);
  const [audio, setAudio] = useState<AudioOwner | null>(null);
  const params = useLocalSearchParams<{ attemptId: string; q: string }>();
  const attempt = params.attemptId ? getAttempt(params.attemptId) : null;
  const qIndex = Number(params.q ?? 0);
  const result = attempt?.details[qIndex] ?? null;
  const question = result ? getQuestionById(result.questionId) : null;

  if (!attempt || !result) {
    return (
      <ScreenBackground style={styles.centered}>
        <Text style={styles.title}>تعذّر تحميل السؤال</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>رجوع</Text>
        </Pressable>
      </ScreenBackground>
    );
  }

  const count = question?.answersCount ?? result.correct.length;
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  const visualFor = (n: number): AnswerVisual => {
    if (result.correct.includes(n)) return "correct";
    if (result.selected.includes(n)) return "wrong";
    return "dim";
  };

  return (
    <ScreenBackground style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={[styles.title, styles.titleFlex]}>السؤال {result.order}</Text>
        </View>

        <View style={styles.status}>
          <Text
            style={[
              styles.statusText,
              { color: result.isCorrect ? colors.success : colors.danger },
            ]}
          >
            {result.isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
            {result.timedOut ? " · انتهى الوقت" : ""}
          </Text>
        </View>

        {question?.imagePath ? (
          <View style={styles.image}>
            <ZoomableImage
              uri={question.imagePath}
              resetKey={question.id}
              style={styles.fill}
            />
            <Pressable
              onPress={() => setViewer(true)}
              hitSlop={8}
              style={styles.zoomBadge}
              accessibilityLabel="عرض الصورة بملء الشاشة"
            >
              <Icon name="zoom" size={16} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}

        {/* The same recording the quiz reads out, replayable here — reviewing a
            wrong answer usually starts with re-hearing the question. Secondary
            styling on purpose: the correction below is the payoff and keeps the
            one accent fill on this screen. */}
        {question?.audioPath ? (
          <AudioPlayButton
            audioPath={question.audioPath}
            owner="question"
            active={audio}
            onActivate={setAudio}
            idleLabel="استمع للسؤال"
            playingLabel="إيقاف السؤال"
            idleIcon="volume"
            variant="secondary"
          />
        ) : null}

        <View style={styles.grid}>
          {numbers.map((n) => (
            <View key={n} style={styles.gridItem}>
              <AnswerButton value={n} visual={visualFor(n)} disabled onPress={() => {}} />
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <Icon name="checkCircle" size={14} color={colors.success} />
            <Text style={[styles.legendText, { color: colors.success }]}>
              الإجابة الصحيحة
            </Text>
          </View>
          <View style={styles.legendRow}>
            <Icon name="closeCircle" size={14} color={colors.danger} />
            <Text style={[styles.legendText, { color: colors.danger }]}>
              اختيارك الخاطئ
            </Text>
          </View>
        </View>

        {/* Hidden by the admin = nothing renders, even though the text and the
            voice-over are still stored on the question. */}
        {question?.correctionHidden ? null : (
          <CorrectionCard
            text={question?.correctionText ?? null}
            // Hiding the voice-over alone keeps the written explanation: a bad
            // recording should not take the whole correction down with it.
            audioPath={
              question?.correctionAudioHidden
                ? null
                : (question?.correctionAudioPath ?? null)
            }
            active={audio}
            onActivate={setAudio}
          />
        )}

        <ImageViewer
          uri={question?.imagePath ?? null}
          visible={viewer}
          onClose={() => setViewer(false)}
        />
      </ScrollView>
    </ScreenBackground>
  );
}

// The correction is the payoff of the whole review flow — an explanation the
// candidate reads AFTER the series, plus the trainer's voice-over when there
// is one. Renders nothing when the admin left both empty.
function CorrectionCard({
  text,
  audioPath,
  active,
  onActivate,
}: {
  text: string | null;
  audioPath: string | null;
  active: AudioOwner | null;
  onActivate: (owner: AudioOwner | null) => void;
}) {
  if (!text && !audioPath) return null;

  return (
    <View style={styles.correction}>
      <View style={styles.correctionHeader}>
        <Icon name="alert" size={16} color={colors.lessons} />
        <Text style={styles.correctionTitle}>التصحيح</Text>
      </View>
      {text ? <Text style={styles.correctionText}>{text}</Text> : null}
      {audioPath ? (
        <AudioPlayButton
          audioPath={audioPath}
          owner="correction"
          active={active}
          onActivate={onActivate}
          idleLabel="استمع للشرح"
          playingLabel="إيقاف الشرح"
          idleIcon="play"
          variant="primary"
        />
      ) : null}
    </View>
  );
}

// One play/pause pill over one local clip. The screen passes `active` down so a
// button whose turn has passed stops itself: two players on one screen would
// otherwise both keep going, and the candidate hears the question read over the
// trainer explaining it.
function AudioPlayButton({
  audioPath,
  owner,
  active,
  onActivate,
  idleLabel,
  playingLabel,
  idleIcon,
  variant,
}: {
  audioPath: string;
  owner: AudioOwner;
  active: AudioOwner | null;
  onActivate: (owner: AudioOwner | null) => void;
  idleLabel: string;
  playingLabel: string;
  idleIcon: "play" | "volume";
  variant: "primary" | "secondary";
}) {
  const player = useAudioPlayer({ uri: audioPath });
  const status = useAudioPlayerStatus(player);
  usePausedOnBlur(player);

  // Someone else took the floor.
  useEffect(() => {
    if (active === owner || !status.playing) return;
    try {
      player.pause();
    } catch {
      // player already released
    }
  }, [active, owner, status.playing, player]);

  const primary = variant === "primary";
  const tint = primary ? colors.onAccent : colors.text;

  const toggle = () => {
    try {
      if (status.playing) {
        player.pause();
        onActivate(null);
        return;
      }
      onActivate(owner);
      // Replay from the top once it has run to the end, otherwise a second
      // press just resumes a finished clip and nothing is heard.
      if (status.didJustFinish || status.currentTime >= status.duration) {
        // seekTo is async; an unhandled rejection here would be a red screen.
        player.seekTo(0).catch(() => undefined);
      }
      player.play();
    } catch {
      // a missing/corrupt file must not break the review
    }
  };

  return (
    <Pressable
      onPress={toggle}
      style={[styles.audioButton, primary ? null : styles.audioButtonSecondary]}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? playingLabel : idleLabel}
    >
      <Icon name={status.playing ? "pause" : idleIcon} size={16} color={tint} />
      <Text style={[styles.audioButtonText, { color: tint }]}>
        {status.playing ? playingLabel : idleLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  // Capped like the results screen: rotated, an uncapped column stretched the
  // picture and the answer buttons across the whole width.
  content: {
    padding: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
    gap: space.md,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  back: { fontFamily: font.extraBold, fontSize: 30, color: colors.text },
  title: { ...type.title, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  status: { alignItems: "flex-start" },
  statusText: { fontFamily: font.bold, fontSize: 16 },
  // 4:3 like the exam pictures themselves, so a landscape photo is not boxed
  // into a tall portrait frame with empty bands above and below.
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  fill: { flex: 1, width: "100%" },
  placeholder: {
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  // Fixed, not a percentage — 22% of a landscape screen made 200pt buttons.
  gridItem: { width: 72 },
  legend: { gap: space.xs, marginTop: space.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  legendText: { ...type.label },
  correction: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.lessons,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.sm,
  },
  correctionHeader: { flexDirection: "row", alignItems: "center", gap: space.xs },
  correctionTitle: { ...type.title, fontSize: 16, color: colors.text },
  correctionText: { ...type.body, color: colors.text, textAlign: "right" },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.lessons,
  },
  // The question replay sits on the screen background, not inside the yellow
  // correction card, so it carries the card treatment instead of an accent fill
  // — one accent per surface.
  audioButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audioButtonText: { fontFamily: font.bold, fontSize: 15 },
  button: {
    paddingHorizontal: space.xl,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.series,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontFamily: font.bold, fontSize: 16, color: colors.onAccent },
});
