import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { AppTextInput } from "@/components/AppTextInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, font, space, type } from "@/theme/tokens";
import { ScreenBackground } from "@/components/ScreenBackground";

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("رقم الهاتف أو كلمة المرور غير صحيحة");
      } else if (e instanceof ApiError && e.status === 429) {
        setError("محاولات كثيرة — انتظر دقيقة ثم حاول مجدداً");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("تعذر الاتصال بالخادم — تحقق من الشبكة");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>طريق</Text>
          <Text style={styles.title}>مرحباً بعودتك 👋</Text>
          <Text style={styles.subtitle}>
            سجّل الدخول لمتابعة التحضير لامتحان رخصة السياقة
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <AppTextInput
            label="رقم الهاتف"
            ltr
            autoCapitalize="none"
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="0612345678"
            value={phone}
            onChangeText={setPhone}
          />
          <AppTextInput
            label="كلمة المرور"
            ltr
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            label="تسجيل الدخول"
            loading={loading}
            disabled={!phone.trim() || !password}
            onPress={() => void submit()}
          />

          <Link href="/forgot" style={styles.link}>
            نسيت كلمة المرور؟
          </Link>

          <Link href="/register" style={styles.link}>
            ليس لديك حساب؟ <Text style={styles.linkStrong}>سجّل الآن</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: space.lg,
    gap: space.md,
    // Forms stay a comfortable width when the phone is turned sideways.
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  logo: {
    fontFamily: font.extraBold,
    fontSize: 44,
    color: colors.lessons,
    textAlign: "center",
    marginBottom: space.sm,
  },
  title: {
    ...type.display,
    color: colors.text,
    textAlign: "right",
  },
  subtitle: {
    ...type.body,
    color: colors.textDim,
    textAlign: "right",
    marginBottom: space.sm,
  },
  error: {
    ...type.label,
    color: colors.danger,
    backgroundColor: "rgba(229,72,77,0.14)",
    padding: space.md,
    borderRadius: 12,
    textAlign: "right",
  },
  link: {
    ...type.label,
    color: colors.textDim,
    textAlign: "center",
    marginTop: space.sm,
  },
  linkStrong: { color: colors.lessons, fontFamily: font.bold },
});
