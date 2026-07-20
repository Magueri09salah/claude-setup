import type { SessionUser } from "./client";

export interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

export interface ManifestSeries {
  id: number;
  title: string;
  orderNum: number;
  isPremium: boolean;
  locked: boolean;
  questionCount: number;
}

export interface Manifest {
  version: number;
  series: ManifestSeries[];
  lessonCategories: unknown[];
  lessons: unknown[];
}

export interface ApiQuestion {
  id: number;
  seriesId: number;
  orderNum: number;
  answersCount: number;
  correctAnswers: number[];
  imageKey: string;
  audioKey: string;
  updatedAt: string;
}
