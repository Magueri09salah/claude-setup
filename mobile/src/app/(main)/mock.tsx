import { useCallback } from "react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { loadMockQuestions } from "@/db/questions";
import { MOCK_SERIES_ID } from "@/quiz/useQuizEngine";

const MOCK_QUESTION_COUNT = 40;

export default function MockExamScreen() {
  // Random questions drawn once across all unlocked series.
  const loadQuestions = useCallback(
    () => loadMockQuestions(MOCK_QUESTION_COUNT),
    [],
  );
  return (
    <QuizRunner
      source={{
        seriesId: MOCK_SERIES_ID,
        title: "امتحان تجريبي",
        loadQuestions,
        syncable: false,
      }}
    />
  );
}
