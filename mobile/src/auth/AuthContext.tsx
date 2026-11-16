import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { router } from "expo-router";
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
import { pushAttempts } from "../quiz/pushAttempts";
import { lockPremiumContent, requestSync } from "../sync/engine";

// GUEST MODE (owner decision 2026-11-12): `user === null` no longer means "show
// the login screen". The app opens on home for everyone; an account is asked
// for only when a guest taps something paid (or asks for driving lessons).

interface AuthValue {
  /** null = a guest. */
  user: SessionUser | null;
  hydrated: boolean;
  // Candidates sign in with their phone; the API accepts a username or email
  // in the same field, which is what keeps the seeded admin working.
  // Both resolve to the account, so the screen can tell whether the allowlist
  // already opened it and route on from there.
  login: (identifier: string, password: string) => Promise<SessionUser>;
  register: (
    username: string,
    phone: string,
    password: string,
    cinLast3: string,
  ) => Promise<SessionUser>;
  logout: () => Promise<void>;
  // The account was just DELETED server-side: drop it from this phone without
  // asking the server anything.
  forgetDeletedAccount: () => Promise<void>;
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

  // The server ended the session (the stored tokens are already cleared). The
  // phone carries on as a guest — but it must not keep the account's paid
  // content, and whatever screen was open may be a paid series or video, so
  // it goes back to the tab it came from. Before guest mode, Stack.Protected
  // did both by swapping the whole app for the login screen.
  useEffect(
    () =>
      onSessionEnded((reason) => {
        setUser(null);
        becomeGuest();
        if (router.canDismiss()) router.dismissAll();
        Alert.alert(
          "تم تسجيل خروجك",
          // Only one phone can hold a candidate account (2026-11-02), and
          // since 2026-11-16 it is the first one that signed in.
          reason === "replaced"
            ? "تم تسجيل الدخول إلى حسابك من هاتف آخر."
            : reason === "bound"
              ? "هذا الحساب مرتبط بهاتف آخر."
              : "انتهت جلستك. سجّل الدخول من جديد للوصول إلى حسابك.",
          [
            { text: "لاحقاً", style: "cancel" },
            { text: "تسجيل الدخول", onPress: () => router.push("/login") },
          ],
        );
      }),
    [],
  );

  const signedIn = useCallback(async (res: LoginResponse) => {
    await storeSession(res.user, res.accessToken, res.refreshToken);
    setUser(res.user);
    // Moves this phone's push token from the guest list to the account.
    void registerPushToken();
    // The guest manifest is on the phone; an account the allowlist already
    // opened changes the etag, and this fetches what it unlocked.
    requestSync();
    // Results taken as a guest go up with the new account.
    void pushAttempts();
    return res.user;
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api<LoginResponse>("/auth/login", {
        method: "POST",
        json: { identifier, password },
      });
      return signedIn(res);
    },
    [signedIn],
  );

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
      return signedIn(res);
    },
    [signedIn],
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
    becomeGuest();
  }, []);

  // Not `logout`: its calls would carry the deleted account's token, get a
  // 401, and the refresh path would then announce "انتهت جلستك" to someone
  // who just chose to leave. The server already removed the account's tokens
  // and devices along with it, so there is nothing to tell it.
  const forgetDeletedAccount = useCallback(async () => {
    await clearSession();
    setUser(null);
    becomeGuest();
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
      value={{
        user,
        hydrated,
        login,
        register,
        logout,
        forgetDeletedAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * The account is gone from this phone (sign-out, deleted account, or a session
 * the server ended) and the app carries on as a guest. The session must already
 * be cleared, so the calls below go out without a token.
 */
function becomeGuest(): void {
  // Lock paid content NOW, not at the next sync — the phone may be offline.
  lockPremiumContent();
  // Then confirm it from the server with the guest manifest.
  requestSync();
  // Still on the daily live push, as a guest (owner decision 2026-11-12).
  void registerPushToken();
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
