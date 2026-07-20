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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, phone.trim() || undefined);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("هذا البريد الإلكتروني أو الهاتف مسجل مسبقاً");
      } else if (e instanceof ApiError && e.status === 400) {
        setError("تحقق من صحة الحقول (رقم الهاتف مثل +2126XXXXXXXX)");
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
          <Text style={styles.title}>إنشاء حساب جديد</Text>
          <Text style={styles.subtitle}>
            دقيقة واحدة وتبدأ التحضير لامتحان رخصة السياقة
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
            label="رقم الهاتف (اختياري)"
            ltr
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <AppTextInput
            label="كلمة المرور (8 أحرف فأكثر)"
            ltr
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            label="إنشاء الحساب"
            loading={loading}
            disabled={!email.trim() || !password}
            onPress={() => void submit()}
          />

          <Link href="/login" style={styles.link}>
            لديك حساب بالفعل؟ <Text style={styles.linkStrong}>سجّل الدخول</Text>
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
