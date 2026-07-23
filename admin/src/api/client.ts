export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000";

const ACCESS_KEY = "tariq.admin.access";
const REFRESH_KEY = "tariq.admin.refresh";
const USER_KEY = "tariq.admin.user";

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN";
  isPremium: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeSession(
  user: SessionUser,
  accessToken: string,
  refreshToken: string,
): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const SESSION_EXPIRED_EVENT = "tariq:session-expired";

// Session is unrecoverable — clear it AND signal React to redirect to login,
// so a dead session never leaves the panel making tokenless requests.
function expireSession(): void {
  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// Single-flight: concurrent 401s must share one refresh call, because the API
// rotates refresh tokens and treats reuse of an old one as theft.
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new ApiError(401, "Session expired");
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new ApiError(401, "Session expired");
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  formData?: FormData;
}

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const accessToken = localStorage.getItem(ACCESS_KEY);
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.formData) {
    body = opts.formData;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const canRefresh = !retried && !!localStorage.getItem(REFRESH_KEY);
    if (canRefresh) {
      refreshInFlight =
        refreshInFlight ??
        refreshSession().finally(() => {
          refreshInFlight = null;
        });
      try {
        await refreshInFlight;
        return await api<T>(path, opts, true);
      } catch {
        // refresh failed — fall through to expire below
      }
    }
    // No refresh token, or refresh/retry still unauthorized → session is dead.
    expireSession();
    throw new ApiError(401, "انتهت الجلسة — سجّل الدخول من جديد");
  }

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
