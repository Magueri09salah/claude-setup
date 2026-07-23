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
  orderNum: number;
  updatedAt: string;
  signCount: number;
  locked: boolean;
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
  updatedAt: string;
}
