import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  clearSession,
  getRefreshToken,
  getStoredUser,
  storeSession,
  type SessionUser,
} from "./api/client";
import type { LoginResponse } from "./api/types";

interface AuthValue {
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(getStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    if (res.user.role !== "ADMIN") {
      throw new ApiError(403, "This panel is for administrators only");
    }
    storeSession(res.user, res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      void api("/auth/logout", {
        method: "POST",
        json: { refreshToken },
      }).catch(() => undefined);
    }
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
