import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { maybeSyncOnForeground } from "@/sync/engine";
import { colors } from "@/theme/tokens";

export default function MainLayout() {
  // Foreground sync trigger, throttled to 1h inside the engine.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void maybeSyncOnForeground();
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
