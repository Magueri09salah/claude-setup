import { useCallback, useEffect, useState } from "react";
import type { IconName } from "../components/Icon";
import { getMeta, setMeta } from "../db";

export const TIMER_CHOICES = [10, 20, 30] as const;
export type TimerChoice = (typeof TIMER_CHOICES)[number];

/** Matches the official exam pace — the safe default for a first-time user. */
export const DEFAULT_SECONDS: TimerChoice = 30;

const KEY = "quiz_seconds";

export const TIMER_LABELS: Record<
  TimerChoice,
  { title: string; hint: string; icon: IconName }
> = {
  10: { title: "10 ثواني", hint: "سريع — للمحترفين", icon: "bolt" },
  20: { title: "20 ثانية", hint: "متوسط — الأكثر شيوعاً", icon: "clockFast" },
  30: { title: "30 ثانية", hint: "مريح — للمبتدئين", icon: "clock" },
};

function isChoice(n: number): n is TimerChoice {
  return (TIMER_CHOICES as readonly number[]).includes(n);
}

export function getQuestionSeconds(): TimerChoice {
  const raw = Number(getMeta(KEY));
  return isChoice(raw) ? raw : DEFAULT_SECONDS;
}

// The quiz screen and the settings tab both show this value, so a change in
// one has to reach the other without a reload — hence a tiny subscription
// rather than each screen holding its own copy.
const listeners = new Set<(v: TimerChoice) => void>();

export function setQuestionSeconds(value: TimerChoice): void {
  setMeta(KEY, String(value));
  for (const fn of listeners) fn(value);
}

export function useQuestionSeconds(): [
  TimerChoice,
  (value: TimerChoice) => void,
] {
  const [seconds, setSeconds] = useState<TimerChoice>(getQuestionSeconds);

  useEffect(() => {
    listeners.add(setSeconds);
    return () => {
      listeners.delete(setSeconds);
    };
  }, []);

  const update = useCallback((value: TimerChoice) => {
    setQuestionSeconds(value);
  }, []);

  return [seconds, update];
}
