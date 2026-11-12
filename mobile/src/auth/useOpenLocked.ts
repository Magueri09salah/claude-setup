import { router } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "./AuthContext";

/**
 * Where a guest goes when they tap something paid: account creation first,
 * which continues to /unlock (see register.tsx — unless the allowlist opened
 * the account on the spot, in which case it just goes back).
 */
export const REGISTER_THEN_UNLOCK = {
  pathname: "/register",
  params: { next: "unlock" },
} as const;

/**
 * What tapping a padlocked item does (guest mode, owner decision 2026-11-12):
 * a GUEST is asked to create an account; a signed-in candidate goes straight to
 * /unlock as before.
 *
 * EVERY locked card goes through this — series, lesson categories, lessons,
 * practical videos, the results screen's "again". Sending a guest to /unlock
 * directly would ask them to request access for an account that does not
 * exist (and on iOS the group request needs one).
 */
export function useOpenLocked(): (opts?: { replace?: boolean }) => void {
  const { user } = useAuth();
  return useCallback(
    (opts?: { replace?: boolean }) => {
      const href = user ? "/unlock" : REGISTER_THEN_UNLOCK;
      if (opts?.replace) router.replace(href);
      else router.push(href);
    },
    [user],
  );
}
