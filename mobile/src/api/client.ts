import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";

// Security checklist: tokens live in expo-secure-store ONLY, never AsyncStorage.
const ACCESS_KEY = "tariq.access";
const REFRESH_KEY = "tariq.refresh";
const USER_KEY = "tariq.user";

const REQUEST_TIMEOUT_MS = 15_000;

export interface SessionUser {
  id: string;
  username: string | null;
  // Optional since registration stopped collecting it.
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: "USER" | "ADMIN" | "ASSISTANT";
  isPremium: boolean;
  /** ISO date the three-month term ends; null = no term (lifetime/none). */
  premiumUntil: string | null;
}

// Local-disk storage (dev) can hand back a relative signed url — resolve it
// against the API host so <Image> has something it can actually fetch.
export function mediaUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// In-memory mirror of the secure store so requests don't await disk reads.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function hydrateSession(): Promise<SessionUser | null> {
  const [access, refresh, userJson] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  accessToken = access;
  refreshToken = refresh;
  if (!refresh || !userJson) return null;
  try {
    return JSON.parse(userJson) as SessionUser;
  } catch {
    return null;
  }
}

export async function storeSession(
  user: SessionUser,
  access: string,
  refresh: string,
): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

// Update just the stored user (e.g. premium flipped after a payment settles).
export async function updateStoredUser(user: SessionUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// Single-flight: concurrent 401s share one refresh call because the API
// rotates refresh tokens and treats reuse of an old one as theft.
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshToken) throw new ApiError(401, "Session expired");
  const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearSession();
    throw new ApiError(401, "Session expired");
  }
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, data.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken),
  ]);
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  headers?: Record<string, string>;
}

// Low-level: returns the raw Response (the sync engine needs 304s + headers).
export async function apiFetch(
  path: string,
  opts: RequestOptions = {},
  retried = false,
): Promise<Response> {
  const headers: Record<string, string> = { ...opts.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  });
  if (res.status === 401 && !retried && !path.startsWith("/auth/") && refreshToken) {
    refreshInFlight =
      refreshInFlight ??
      refreshSession().finally(() => {
        refreshInFlight = null;
      });
    await refreshInFlight;
    return apiFetch(path, opts, true);
  }
  return res;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}
