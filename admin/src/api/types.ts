import type { SessionUser } from "./client";

export interface Series {
  id: number;
  title: string;
  orderNum: number;
  isPremium: boolean;
  _count?: { questions: number };
}

export interface Question {
  id: number;
  seriesId: number;
  orderNum: number;
  answersCount: number;
  correctAnswers: number[];
  imageKey: string;
  audioKey: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: number;
  parentId: number | null;
  title: string;
  iconKey: string | null;
  orderNum: number;
  isPremium: boolean;
  _count?: { lessons: number; children: number };
}

export interface Lesson {
  id: number;
  categoryId: number;
  title: string;
  orderNum: number;
  _count?: { signs: number };
}

export interface Sign {
  id: number;
  lessonId: number;
  orderNum: number;
  name: string;
  imageKey: string;
  audioKey: string | null;
}
