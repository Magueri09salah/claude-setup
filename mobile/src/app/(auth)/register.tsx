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
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (username.trim().length < 3) {
      setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }
    if (!/^[A-Za-z0-9._@-]+$/.test(username.trim())) {
      setError("اسم المستخدم يقبل الحروف والأرقام و . _ - @ فقط");
      return;
    }
    if (phone.trim().length < 9) {
      setError("أدخل رقم هاتفك — هو الذي تسجّل به الدخول");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), phone.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // The API says which of the two is taken — show that, not a guess.
        setError(e.message);
      } else if (e instanceof ApiError && e.status === 400) {
        setError("تحقق من صحة الحقول");
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
          <Text style={styles.hint}>
            تسجيل الدخول لاحقاً يكون برقم الهاتف وكلمة المرور
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <AppTextInput
            label="اسم المستخدم"
            ltr
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="salah@magueri"
            value={username}
            onChangeText={setUsername}
          />
          <AppTextInput
            label="رقم الهاتف"
            ltr
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="0612345678"
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
            disabled={!username.trim() || !phone.trim() || !password}
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
  hint: {
    ...type.label,
    fontSize: 12,
    color: colors.textDim,
    textAlign: "center",
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
