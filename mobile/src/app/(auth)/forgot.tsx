import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { api, ApiError } from "@/api/client";
import { AppTextInput } from "@/components/AppTextInput";
import { Icon } from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { colors, font, space, type } from "@/theme/tokens";

// Two steps on one screen: prove ownership with the phone + the 3 digits the
// candidate chose at registration, then pick a new password. The password
// fields only appear after the code is accepted, so nobody types a new password
// to be told the code was wrong. Three wrong codes lock the account for 24h
// (server-side).
export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState("");
  const [cin, setCin] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      // The API's messages already carry the attempts left / lockout hours.
      setError(e.message);
    } else {
      setError("تعذر الاتصال بالخادم — تحقق من الشبكة");
    }
  };

  const verify = async () => {
    setError(null);
    if (!/^[0-9]{3}$/.test(cin.trim())) {
      setError("أدخل الأرقام الثلاثة التي اخترتها عند التسجيل");
      return;
    }
    setLoading(true);
    try {
      const r = await api<{ resetToken: string }>("/auth/forgot/verify", {
        method: "POST",
        json: { phone: phone.trim(), cinLast3: cin.trim() },
      });
      setResetToken(r.resetToken);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/forgot/reset", {
        method: "POST",
        json: { resetToken, newPassword: password },
      });
      setDone(true);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ScreenBackground style={styles.screen}>
        <ScrollView contentContainerStyle={styles.centered}>
          <Icon name="checkCircle" size={48} color={colors.success} />
          <Text style={styles.title}>تم تغيير كلمة المرور</Text>
          <Text style={styles.subtitle}>
            سجّل الدخول برقم هاتفك وكلمة المرور الجديدة.
          </Text>
          <PrimaryButton
            label="تسجيل الدخول"
            onPress={() => router.replace("/login")}
          />
        </ScrollView>
      </ScreenBackground>
    );
  }

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
          <Text style={styles.title}>نسيت كلمة المرور</Text>
          <Text style={styles.subtitle}>
            {resetToken
              ? "اختر كلمة مرور جديدة لحسابك"
              : "أدخل رقم هاتفك والأرقام الثلاثة التي اخترتها عند التسجيل"}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          {!resetToken ? (
            <>
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
                placeholder="123"
                value={cin}
                onChangeText={setCin}
              />
              <Text style={styles.hint}>
                لديك 3 محاولات فقط، بعدها يُقفل الاسترجاع 24 ساعة
              </Text>
              <PrimaryButton
                label="تحقق"
                loading={loading}
                disabled={!phone.trim() || !cin.trim()}
                onPress={() => void verify()}
              />
            </>
          ) : (
            <>
              {/* textContentType is NOT optional here (owner report 2026-09-24:
                  the confirm field would not accept typing on iPhone). With two
                  secureTextEntry boxes and no content type, iOS guesses they are
                  a password pair, puts its own "Strong Password" AutoFill on top
                  of them, and swallows what you type into the second one. Saying
                  newPassword outright makes iOS handle the pair properly instead
                  of guessing. */}
              <AppTextInput
                label="كلمة المرور الجديدة (8 أحرف فأكثر)"
                ltr
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                passwordRules="minlength: 8;"
                value={password}
                onChangeText={setPassword}
              />
              <AppTextInput
                label="تأكيد كلمة المرور"
                ltr
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                passwordRules="minlength: 8;"
                value={confirm}
                onChangeText={setConfirm}
              />
              <PrimaryButton
                label="حفظ كلمة المرور"
                loading={loading}
                disabled={!password || !confirm}
                onPress={() => void submit()}
              />
            </>
          )}

          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>رجوع لتسجيل الدخول</Text>
          </Pressable>
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
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: space.xl,
    gap: space.md,
  },
  title: { ...type.display, fontSize: 26, color: colors.text, textAlign: "center" },
  subtitle: { ...type.body, color: colors.textDim, textAlign: "center" },
  hint: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "center" },
  error: {
    ...type.label,
    color: colors.danger,
    textAlign: "center",
  },
  link: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.lessons,
    textAlign: "center",
  },
});
