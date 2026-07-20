import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth";

const LTR_INPUT = { input: { direction: "ltr" as const } };

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/series" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/series", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("هذه اللوحة مخصصة للمشرفين فقط");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("تعذر تسجيل الدخول — تحقق من اتصالك");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)">
      <Card w={380} padding="xl" radius="lg" shadow="md" withBorder>
        <form onSubmit={(e) => void submit(e)}>
          <Stack>
            <div>
              <Title order={3}>طريق — لوحة الإدارة</Title>
              <Text c="dimmed" size="sm">
                تسجيل الدخول للمشرفين فقط
              </Text>
            </div>
            {error && <Alert color="red">{error}</Alert>}
            <TextInput
              label="البريد الإلكتروني"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              styles={LTR_INPUT}
            />
            <PasswordInput
              label="كلمة المرور"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              styles={LTR_INPUT}
            />
            <Button type="submit" loading={loading} fullWidth>
              تسجيل الدخول
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
