import { db, type QuestionRow } from "./index";

export interface LocalQuestion {
  id: number;
  seriesId: number;
  orderNum: number;
  answersCount: number;
  correctAnswers: number[];
  imagePath: string | null;
  audioPath: string | null;
  // Shown only in the end-of-quiz review, never while answering.
  correctionText: string | null;
  correctionAudioPath: string | null;
}

function fromRow(r: QuestionRow): LocalQuestion {
  return {
    id: r.id,
    seriesId: r.series_id,
    orderNum: r.order_num,
    answersCount: r.answers_count,
    correctAnswers: JSON.parse(r.correct_answers) as number[],
    imagePath: r.image_path,
    audioPath: r.audio_path,
    correctionText: r.correction_text,
    correctionAudioPath: r.correction_audio_path,
  };
}

// Downloaded questions only — media must be on disk to play (quiz-engine skill).
export function loadSeriesQuestions(seriesId: number): LocalQuestion[] {
  const rows = db.getAllSync<QuestionRow>(
    "SELECT * FROM questions WHERE series_id = ? AND downloaded = 1 ORDER BY order_num ASC",
    seriesId,
  );
  return rows.map(fromRow);
}

export function getQuestionById(id: number): LocalQuestion | null {
  const row = db.getFirstSync<QuestionRow>(
    "SELECT * FROM questions WHERE id = ?",
    id,
  );
  return row ? fromRow(row) : null;
}

// Random downloaded questions across all unlocked series — the mock exam.
export function loadMockQuestions(limit: number): LocalQuestion[] {
  const rows = db.getAllSync<QuestionRow>(
    `SELECT q.* FROM questions q
       JOIN series s ON s.id = q.series_id
      WHERE q.downloaded = 1 AND s.locked = 0
      ORDER BY RANDOM()
      LIMIT ?`,
    limit,
  );
  return rows.map(fromRow);
}

export function countDownloaded(seriesId: number): number {
  return (
    db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM questions WHERE series_id = ? AND downloaded = 1",
      seriesId,
    )?.n ?? 0
  );
}
