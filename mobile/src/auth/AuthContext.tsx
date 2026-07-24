import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  clearSession,
  getRefreshToken,
  hydrateSession,
  storeSession,
  updateStoredUser,
  type SessionUser,
} from "../api/client";
import type { LoginResponse } from "../api/types";

interface AuthValue {
  user: SessionUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  // Re-fetch the current user (premium may have flipped after a payment).
  refreshUser: () => Promise<SessionUser | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setHydrated(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    await storeSession(res.user, res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, phone?: string) => {
      const res = await api<LoginResponse>("/auth/register", {
        method: "POST",
        json: phone ? { email, password, phone } : { email, password },
      });
      await storeSession(res.user, res.accessToken, res.refreshToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api("/auth/logout", { method: "POST", json: { refreshToken } }).catch(
        () => undefined,
      );
    }
    await clearSession();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api<{ user: SessionUser }>("/auth/me");
      await updateStoredUser(res.user);
      setUser(res.user);
      return res.user;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, hydrated, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
