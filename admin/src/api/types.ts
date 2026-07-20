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
