import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/tajawal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { migrate } from "@/db";
import { colors } from "@/theme/tokens";

// Runs at import time, before React mounts. A throw here used to kill the app
// on launch with no UI at all — impossible to diagnose without a USB cable.
// Caught and remembered instead, so the app still starts and can say why.
let migrationError: string | null = null;
try {
  migrate();
} catch (e) {
  migrationError = e instanceof Error ? e.message : String(e);
  console.error("[db] migrate() failed at startup:", e);
}

// The WHOLE app rotates (owner decision 2026-08-14): app.json declares
// "default" orientation and nothing locks it, so every screen must hold up in
// landscape — see useResponsive for the shared breakpoint.
SplashScreen.preventAutoHideAsync();

function Gate() {
  const { user, hydrated } = useAuth();
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    if (hydrated && fontsLoaded) void SplashScreen.hideAsync();
  }, [hydrated, fontsLoaded]);

  // The local database is what every learning screen reads from, so there is no
  // usable app without it. Say so rather than showing an empty screen.
  if (migrationError) {
    return (
      <View style={styles.fatal}>
        <Text style={styles.fatalTitle}>تعذّر تشغيل التطبيق</Text>
        <Text style={styles.fatalBody}>{migrationError}</Text>
      </View>
    );
  }

  if (!hydrated || !fontsLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(main)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // Required by react-native-gesture-handler: without it GestureDetector
    // silently receives no touches on Android (the image viewer's pinch/pan).
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Required by useSafeAreaInsets — without it the hook throws. The quiz
          needs real insets in landscape, where the notch and home indicator sit
          beside the controls rather than above them. */}
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Gate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fatal: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: colors.bg,
  },
  fatalTitle: { color: colors.text, fontSize: 18, textAlign: "center" },
  fatalBody: { color: colors.textDim, fontSize: 13, textAlign: "center" },
});
