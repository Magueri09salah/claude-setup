import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/tajawal";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { migrate } from "@/db";
import { colors } from "@/theme/tokens";

migrate();

// app.json declares "default" orientation because iOS otherwise refuses to let
// the image viewer rotate at all. Everything else stays portrait, so lock it
// here at startup; only the viewer unlocks, and it restores this on close.
void ScreenOrientation.lockAsync(
  ScreenOrientation.OrientationLock.PORTRAIT_UP,
).catch(() => undefined);

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
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
