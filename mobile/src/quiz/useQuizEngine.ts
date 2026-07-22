import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LocalQuestion } from "../db/questions";
import { saveAttempt, uuidv4 } from "../db/attempts";
import { pushAttempts } from "./pushAttempts";
import { isExactMatch } from "./scoring";
import { passMarkFor, type QuestionResult } from "./types";

export const QUESTION_SECONDS = 30;

export interface QuizSource {
  // Real series id, or MOCK_SERIES_ID (0) for the random mock exam.
  seriesId: number;
  loadQuestions: () => LocalQuestion[];
  // false = local-only attempt (mock exam has no server-side series).
  syncable: boolean;
}

export const MOCK_SERIES_ID = 0;

// No per-question correction — answers are revealed only on the results grid
// at the end of the quiz (matches the real exam; see quiz-engine skill).
export type QuizPhase = "playing" | "finished" | "empty";

export interface QuizState {
  phase: QuizPhase;
  question: LocalQuestion | null;
  index: number;
  total: number;
  timeLeft: number;
  selected: number[];
  results: QuestionResult[];
  score: number;
  passMark: number;
  passed: boolean;
  attemptId: string | null;
  toggle: (n: number) => void;
  confirm: () => void;
  skip: () => void;
}

// Pure engine (quiz-engine skill): 30s timer, toggle multi-select, ✓ / auto-
// submit on timeout, exact-set scoring, immediate advance (no per-question
// correction — reveals happen only on the results grid).
export function useQuizEngine(source: QuizSource): QuizState {
  const { seriesId, loadQuestions, syncable } = source;
  const questions = useMemo(() => loadQuestions(), [loadQuestions]);
  const total = questions.length;
  const passMark = passMarkFor(total);

  const [phase, setPhase] = useState<QuizPhase>(total === 0 ? "empty" : "playing");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // resultsRef is the source of truth; state mirror is for render.
  const resultsRef = useRef<QuestionResult[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const submittingRef = useRef(false);

  const question =
    phase === "finished" || phase === "empty" ? null : questions[index] ?? null;

  const finish = useCallback(
    (allResults: QuestionResult[]) => {
      const score = allResults.filter((r) => r.isCorrect).length;
      const passed = score >= passMark;
      const id = uuidv4();
      saveAttempt(
        {
          id,
          seriesId,
          score,
          total,
          passed,
          finishedAt: new Date().toISOString(),
          details: allResults,
        },
        // Mock attempts are marked synced so they're never pushed to the server.
        !syncable,
      );
      setAttemptId(id);
      setPhase("finished");
      // Mock attempts stay local (no server-side series); real ones upload.
      if (syncable) void pushAttempts();
    },
    [passMark, seriesId, total, syncable],
  );

  const submit = useCallback(
    (picks: number[], timedOut: boolean) => {
      if (submittingRef.current) return;
      const q = questions[index];
      if (!q) return;
      submittingRef.current = true;
      resultsRef.current = [
        ...resultsRef.current,
        {
          questionId: q.id,
          // Position in this quiz (1..N) — tile label; stable for mock exams
          // where questions come from many series with clashing orderNums.
          order: index + 1,
          selected: picks,
          correct: q.correctAnswers,
          isCorrect: isExactMatch(picks, q.correctAnswers),
          timedOut,
        },
      ];
      setResults(resultsRef.current);

      // No feedback pause — advance immediately, or finish after the last one.
      if (index + 1 >= total) {
        finish(resultsRef.current);
      } else {
        setIndex((i) => i + 1);
        setSelected([]);
        setTimeLeft(QUESTION_SECONDS);
        submittingRef.current = false;
      }
    },
    [index, questions, total, finish],
  );

  // Countdown — one interval, only while playing.
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, index]);

  // Auto-submit at timeout with the current selection.
  useEffect(() => {
    if (phase === "playing" && timeLeft <= 0) {
      submit(selected, true);
    }
  }, [phase, timeLeft, selected, submit]);

  const toggle = useCallback(
    (n: number) => {
      if (phase !== "playing") return;
      setSelected((prev) =>
        prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
      );
    },
    [phase],
  );

  const confirm = useCallback(() => {
    if (phase !== "playing") return;
    submit(selected, false);
  }, [phase, selected, submit]);

  // ✗ = skip = wrong (empty selection).
  const skip = useCallback(() => {
    if (phase !== "playing") return;
    submit([], false);
  }, [phase, submit]);

  const score = results.filter((r) => r.isCorrect).length;

  return {
    phase,
    question,
    index,
    total,
    timeLeft,
    selected,
    results,
    score,
    passMark,
    passed: score >= passMark,
    attemptId,
    toggle,
    confirm,
    skip,
  };
}
