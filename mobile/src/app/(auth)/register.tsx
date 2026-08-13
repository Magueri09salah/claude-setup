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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (fullName.trim().length < 3) {
      setError("أدخل اسمك الكامل (3 أحرف على الأقل)");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await register(
        fullName.trim(),
        email.trim(),
        password,
        phone.trim() || undefined,
      );
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
    <ScreenBackground style={styles.screen}>
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
            label="الاسم الكامل"
            autoComplete="name"
            value={fullName}
            onChangeText={setFullName}
          />
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
            disabled={!fullName.trim() || !email.trim() || !password}
            onPress={() => void submit()}
          />

          <Link href="/login" style={styles.link}>
            لديك حساب بالفعل؟ <Text style={styles.linkStrong}>سجّل الدخول</Text>
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
