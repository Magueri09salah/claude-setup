import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePausedOnBlur } from "@/audio/usePausedOnBlur";
import { Icon } from "@/components/Icon";
import { AnswerButton, type AnswerVisual } from "@/components/quiz/AnswerButton";
import { getAttempt } from "@/db/attempts";
import { getQuestionById } from "@/db/questions";
import { colors, font, radius, space, type } from "@/theme/tokens";

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ attemptId: string; q: string }>();
  const attempt = params.attemptId ? getAttempt(params.attemptId) : null;
  const qIndex = Number(params.q ?? 0);
  const result = attempt?.details[qIndex] ?? null;
  const question = result ? getQuestionById(result.questionId) : null;

  if (!attempt || !result) {
    return (
      <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.centered}>
        <Text style={styles.title}>تعذّر تحميل السؤال</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>رجوع</Text>
        </Pressable>
      </LinearGradient>
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
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
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
          <Image
            source={{ uri: question.imagePath }}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}

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

        <CorrectionCard
          text={question?.correctionText ?? null}
          audioPath={question?.correctionAudioPath ?? null}
        />
      </ScrollView>
    </LinearGradient>
  );
}

// The correction is the payoff of the whole review flow — an explanation the
// candidate reads AFTER the series, plus the trainer's voice-over when there
// is one. Renders nothing when the admin left both empty.
function CorrectionCard({
  text,
  audioPath,
}: {
  text: string | null;
  audioPath: string | null;
}) {
  const player = useAudioPlayer(audioPath ? { uri: audioPath } : null);
  const status = useAudioPlayerStatus(player);
  usePausedOnBlur(player);

  if (!text && !audioPath) return null;

  const toggle = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish || status.currentTime >= status.duration) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch {
      // a missing/corrupt file must not break the review
    }
  };

  return (
    <View style={styles.correction}>
      <View style={styles.correctionHeader}>
        <Icon name="alert" size={16} color={colors.lessons} />
        <Text style={styles.correctionTitle}>التصحيح</Text>
      </View>
      {text ? <Text style={styles.correctionText}>{text}</Text> : null}
      {audioPath ? (
        <Pressable onPress={toggle} style={styles.audioButton}>
          <Icon
            name={status.playing ? "pause" : "play"}
            size={16}
            color={colors.onAccent}
          />
          <Text style={styles.audioButtonText}>
            {status.playing ? "إيقاف الشرح" : "استمع للشرح"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  content: { padding: space.lg, paddingTop: space.xxl, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  back: { fontFamily: font.extraBold, fontSize: 30, color: colors.text },
  title: { ...type.title, color: colors.text },
  titleFlex: { flex: 1, textAlign: "right" },
  status: { alignItems: "flex-start" },
  statusText: { fontFamily: font.bold, fontSize: 16 },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { ...type.label, color: colors.textDim },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  gridItem: { width: "22%", minWidth: 64 },
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
  audioButtonText: { fontFamily: font.bold, fontSize: 15, color: colors.onAccent },
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
