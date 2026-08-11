import type { SessionUser } from "./client";

export interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

/** Moroccan licence categories: B = car, A = moto, C = truck, D = bus. */
export type LicenceCategory = "B" | "A" | "C" | "D";

export interface ManifestSeries {
  id: number;
  title: string;
  orderNum: number;
  isPremium: boolean;
  locked: boolean;
  questionCount: number;
  category?: LicenceCategory;
}

export interface ManifestCategory {
  id: number;
  parentId: number | null;
  title: string;
  iconKey: string | null;
  orderNum: number;
  isPremium: boolean;
  locked: boolean;
}

export interface ManifestLesson {
  id: number;
  categoryId: number;
  title: string;
  imageKey?: string | null;
  kind?: "SIGNS" | "VIDEOS";
  orderNum: number;
  updatedAt: string;
  signCount: number;
  videoCount?: number;
  locked: boolean;
}

/** Streamed, never stored locally — see /content/lessons/:id/videos. */
export interface ApiLessonVideo {
  id: number;
  lessonId: number;
  orderNum: number;
  title: string;
  sizeBytes: number | null;
  url: string;
}

export interface Manifest {
  version: number;
  series: ManifestSeries[];
  lessonCategories: ManifestCategory[];
  lessons: ManifestLesson[];
}

export interface ApiSign {
  id: number;
  lessonId: number;
  orderNum: number;
  name: string;
  imageKey: string;
  audioKey: string | null;
}

export interface ApiQuestion {
  id: number;
  seriesId: number;
  orderNum: number;
  answersCount: number;
  correctAnswers: number[];
  imageKey: string;
  audioKey: string;
  correctionText: string | null;
  correctionAudioKey: string | null;
  updatedAt: string;
}
