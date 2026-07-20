import { LinearGradient } from "expo-linear-gradient";
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
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
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={styles.screen}>
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
            label="البريد الإلكتروني"
            ltr
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
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
            disabled={!email.trim() || !password}
            onPress={() => void submit()}
          />

          <Link href="/register" style={styles.link}>
            ليس لديك حساب؟ <Text style={styles.linkStrong}>سجّل الآن</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
  },
  logo: {
    fontFamily: font.extraBold,
    fontSize: 44,
    color: colors.textOnDark,
    textAlign: "center",
    marginBottom: space.sm,
  },
  title: {
    ...type.display,
    color: colors.textOnDark,
    textAlign: "left",
  },
  subtitle: {
    ...type.body,
    color: colors.textOnDarkDim,
    textAlign: "left",
    marginBottom: space.sm,
  },
  error: {
    ...type.label,
    color: colors.danger,
    backgroundColor: "rgba(235,87,87,0.12)",
    padding: space.md,
    borderRadius: 12,
    textAlign: "left",
  },
  link: {
    ...type.label,
    color: colors.textOnDarkDim,
    textAlign: "center",
    marginTop: space.sm,
  },
  linkStrong: { color: colors.series, fontFamily: font.bold },
});
