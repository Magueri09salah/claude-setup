import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { pushAttempts } from "@/quiz/pushAttempts";
import { maybeSyncOnForeground } from "@/sync/engine";
import { colors } from "@/theme/tokens";

export default function MainLayout() {
  // Foreground triggers: throttled content sync + eager attempt upload.
  useEffect(() => {
    void pushAttempts();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void maybeSyncOnForeground();
        void pushAttempts();
      }
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
