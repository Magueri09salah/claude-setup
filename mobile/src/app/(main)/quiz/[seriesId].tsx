import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { getSeries } from "@/db";
import { loadSeriesQuestions } from "@/db/questions";

export default function SeriesQuizScreen() {
  const params = useLocalSearchParams<{ seriesId: string }>();
  const seriesId = Number(params.seriesId);
  const loadQuestions = useCallback(
    () => loadSeriesQuestions(seriesId),
    [seriesId],
  );
  const title = getSeries(seriesId)?.title ?? "السلسلة";
  return (
    <QuizRunner source={{ seriesId, title, loadQuestions, syncable: true }} />
  );
}
