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
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { migrate } from "@/db";
import { colors } from "@/theme/tokens";

migrate();

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
