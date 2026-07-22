import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
            {result.isCorrect ? "إجابة صحيحة ✅" : "إجابة خاطئة ❌"}
            {result.timedOut ? " · انتهى الوقت" : ""}
          </Text>
        </View>

        {question?.imagePath ? (
          <Image
            source={{ uri: question.imagePath }}
            style={styles.image}
            contentFit="cover"
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
          <Text style={[styles.legendText, { color: colors.success }]}>
            🟢 الإجابة الصحيحة
          </Text>
          <Text style={[styles.legendText, { color: colors.danger }]}>
            🔴 اختيارك الخاطئ
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
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
  legendText: { ...type.label },
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
