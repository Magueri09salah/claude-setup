import type { SessionUser } from "./client";

/** Moroccan licence categories: B = car, A = moto, C = truck, D = bus. */
export type LicenceCategory = "B" | "A" | "C" | "D";

export interface Series {
  id: number;
  title: string;
  orderNum: number;
  isPremium: boolean;
  category: LicenceCategory;
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
  correctionText: string | null;
  correctionAudioKey: string | null;
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

/** A lesson holds either sign flashcards or videos, never both. */
export type LessonKind = "SIGNS" | "VIDEOS";

export interface Lesson {
  id: number;
  categoryId: number;
  title: string;
  orderNum: number;
  /** Optional cover shown on the lesson card. */
  imageKey: string | null;
  kind: LessonKind;
  _count?: { signs: number; videos: number };
}

export interface LessonVideo {
  id: number;
  lessonId: number;
  orderNum: number;
  title: string;
  videoKey: string;
  sizeBytes: number | null;
}

/** A phone number that receives premium without paying. */
export interface AllowlistEntry {
  id: string;
  phone: string;
  note: string | null;
  addedById: string;
  claimedAt: string | null;
  claimedBy: string | null;
  createdAt: string;
  claimedUser: { id: string; email: string; fullName: string | null } | null;
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
  fullName: string | null;
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

export type LivePlatform = "YOUTUBE" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

export interface LiveSettings {
  id: number;
  youtubeUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  /** "HH:mm" wall-clock in Africa/Casablanca. */
  startTime: string;
  enabled: boolean;
  lastReminderOn: string | null;
  lastStartOn: string | null;
  lastPushReach: number;
  updatedAt: string;
}

/** What the mobile app will actually see for these settings. */
export interface LivePreview {
  enabled: boolean;
  startTime: string;
  platforms: { platform: LivePlatform; url: string }[];
  nextStartAt: string;
  isLive: boolean;
  startsSoon: boolean;
}

export interface DashboardStats {
  users: number;
  premiumUsers: number;
  revenue: number;
  paidCount: number;
  attempts: number;
  pushReach: number;
  liveStartTime: string;
  liveEnabled: boolean;
  nextLiveAt: string;
  recentAttempts: {
    id: string;
    seriesId: number;
    score: number;
    total: number;
    passed: boolean;
    finishedAt: string;
    userEmail: string;
  }[];
}

export type PayStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export interface AdminPayment {
  id: string;
  userEmail: string;
  userName: string | null;
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
