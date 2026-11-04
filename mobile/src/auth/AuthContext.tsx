import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import {
  api,
  clearSession,
  getRefreshToken,
  hydrateSession,
  onSessionEnded,
  storeSession,
  updateStoredUser,
  type SessionUser,
} from "../api/client";
import type { LoginResponse } from "../api/types";
import { registerPushToken, unregisterPushToken } from "../notifications/push";

interface AuthValue {
  user: SessionUser | null;
  hydrated: boolean;
  // Candidates sign in with their phone; the API accepts a username or email
  // in the same field, which is what keeps the seeded admin working.
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    phone: string,
    password: string,
    cinLast3: string,
  ) => Promise<void>;
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

  // The server ended the session (the stored tokens are already cleared):
  // back to the login screen now. A login on another phone gets a message,
  // because only one phone can hold a candidate account.
  useEffect(
    () =>
      onSessionEnded((reason) => {
        setUser(null);
        if (reason === "replaced") {
          Alert.alert("تم تسجيل خروجك", "تم تسجيل الدخول إلى حسابك من هاتف آخر.", [
            { text: "حسناً" },
          ]);
        }
      }),
    [],
  );

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      json: { identifier, password },
    });
    await storeSession(res.user, res.accessToken, res.refreshToken);
    setUser(res.user);
    void registerPushToken();
  }, []);

  const register = useCallback(
    async (
      username: string,
      phone: string,
      password: string,
      cinLast3: string,
    ) => {
      const res = await api<LoginResponse>("/auth/register", {
        method: "POST",
        json: { username, phone, password, cinLast3 },
      });
      await storeSession(res.user, res.accessToken, res.refreshToken);
      setUser(res.user);
      void registerPushToken();
    },
    [],
  );

  const logout = useCallback(async () => {
    await unregisterPushToken();
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
