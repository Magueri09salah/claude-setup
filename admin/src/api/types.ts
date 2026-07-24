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

export type UserStatus = "paid" | "pending" | "free";

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN";
  isPremium: boolean;
  premiumUntil: string | null;
  createdAt: string;
  deviceCount: number;
  status: UserStatus;
  method: "ONLINE" | "WAFACASH" | null;
  lastPaidAt: string | null;
}

export type PayStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export interface AdminPayment {
  id: string;
  userEmail: string;
  userPhone: string | null;
  method: "ONLINE" | "WAFACASH";
  amount: number;
  currency: string;
  status: PayStatus;
  wafacashCode: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}
