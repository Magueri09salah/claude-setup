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
  const [cinLast3, setCinLast3] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    // Drop the invisible bidi marks that come with Arabic pasted from WhatsApp
    // and collapse runs of spaces, exactly the way the API does — the server is
    // the authority (api/src/modules/auth/username.ts); this only keeps the
    // message under the field honest about what it will accept.
    const name = username
      .replace(/[؜​-‏‪-‮⁦-⁩﻿]/g, "")
      .trim()
      .replace(/\s+/g, " ");
    if (name.length < 3) {
      setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }
    // Spaces are allowed (owner decision 2026-09-15) and Arabic (2026-09-18) —
    // a real name, not a handle. Nothing beyond the length is required: no
    // digit, no punctuation. Written as explicit ranges rather than \p{L}
    // because Hermes is the engine here, not V8.
    if (
      !/^[A-Za-z0-9؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ._@ -]+$/.test(
        name,
      )
    ) {
      setError("اسم المستخدم يقبل الحروف والأرقام والمسافة و . _ - @ فقط");
      return;
    }
    if (phone.trim().length < 9) {
      setError("أدخل رقم هاتفك — هو الذي تسجّل به الدخول");
      return;
    }
    if (!/^[0-9]{3}$/.test(cinLast3.trim())) {
      setError("اختر 3 أرقام لاستعادة كلمة المرور");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await register(name, phone.trim(), password, cinLast3.trim());
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

          {/* No `ltr` here, unlike the phone and CIN fields: this one now holds
              Arabic as well as Latin, and forcing left alignment puts an Arabic
              name on the wrong side of its own box. */}
          <AppTextInput
            label="اسم المستخدم"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="الاسم والنسب"
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
            label="3 أرقام لاستعادة كلمة المرور"
            ltr
            keyboardType="number-pad"
            maxLength={3}
            placeholder="471"
            value={cinLast3}
            onChangeText={setCinLast3}
          />
          <Text style={styles.hint}>
            اختر 3 أرقام تتذكّرها — ستحتاجها وحدها لاستعادة كلمة المرور إذا نسيتها
          </Text>
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
            disabled={
              !username.trim() || !phone.trim() || !cinLast3.trim() || !password
            }
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
    // Forms stay a comfortable width when the phone is turned sideways.
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
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
