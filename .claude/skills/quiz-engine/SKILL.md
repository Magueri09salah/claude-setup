---
name: quiz-engine
description: Exact behavioral rules for the exam quiz — timer, multi-select toggles, scoring, results, attempts. Use before implementing or modifying the quiz screen, results screen, scoring logic, or progress stats.
---

# Quiz Engine — Exact Rules (do not deviate)

## Per-question flow
1. Load question image + audio from LOCAL paths (SQLite row). Never remote.
2. Autoplay audio (expo-audio). Replay button available in top bar.
3. Start 30s countdown. Pause button allowed in training mode only.
4. Number buttons (1..answersCount) are TOGGLES — multi-select, clear selected state.
5. Submit on ✓ press OR timer reaching 0 (auto-submit current selection).
   Empty selection at timeout = wrong, flag timedOut=true. ✗ = skip = wrong.
6. Scoring: EXACT set equality — sort(selected) === sort(correctAnswers).
   No partial credit ever.
7. Feedback overlay 1.5s: correct buttons flash success, wrong picks flash danger.
8. Auto-advance. After question 40 → save attempt → results screen.

## Data
QuestionResult = { questionId, order, selected:number[], correct:number[],
isCorrect, timedOut }. Attempt = { seriesId, score, total:40, passed: score>=32,
finishedAt, detailsJson: QuestionResult[] } → SQLite always; POST /attempts when online.

## Results screen
Score /40 + pass verdict (mark = 32) + circular ring + review list (tap row →
reopen question image with the user's picks overlaid red, correct answers green).

## Progress screen (all offline from local attempts)
Per-series best score + attempt count + last result · overall pass rate ·
weakest 3 series (lowest best scores) · history list newest-first.

## State
Keep engine in a hook `useQuizEngine(seriesId)` — pure logic, testable, no UI.
Timer via a single interval; clear on unmount; freeze during feedback overlay.
