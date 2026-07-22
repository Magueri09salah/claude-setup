import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { loadSeriesQuestions } from "@/db/questions";

export default function SeriesQuizScreen() {
  const params = useLocalSearchParams<{ seriesId: string }>();
  const seriesId = Number(params.seriesId);
  const loadQuestions = useCallback(
    () => loadSeriesQuestions(seriesId),
    [seriesId],
  );
  return (
    <QuizRunner source={{ seriesId, loadQuestions, syncable: true }} />
  );
}
