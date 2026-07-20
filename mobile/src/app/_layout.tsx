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
import { I18nManager } from "react-native";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { migrate } from "@/db";
import { colors } from "@/theme/tokens";

// RTL-first: forced at entry. In Expo Go the very first launch may need one
// reload for the flip to apply natively.
I18nManager.allowRTL(true);
if (!I18nManager.isRTL) I18nManager.forceRTL(true);

migrate();

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
    <AuthProvider>
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}
