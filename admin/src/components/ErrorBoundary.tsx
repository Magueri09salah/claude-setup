import { Alert, Button, Code, Group, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Remount the subtree when this changes (e.g. the current route). */
  resetKey?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

// Without this, a single render exception unmounts the whole app and leaves a
// blank white page with no way back — the admin looked simply "broken". Now the
// failure is contained, named on screen, and recoverable.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    console.error("[admin] render error:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    // Navigating away from a broken page should clear the error, not strand
    // the user on it.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, info: null });
    }
  }

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <Stack maw={760}>
        <Title order={3}>حدث خطأ في هذه الصفحة</Title>
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="تفاصيل الخطأ"
        >
          <Text size="sm" mb="xs">
            لم تُفقد أي بيانات. أعد تحميل الصفحة، وإذا تكرر الخطأ أرسل النص
            التالي للمطوّر.
          </Text>
          <Code block dir="ltr" style={{ whiteSpace: "pre-wrap" }}>
            {error.message}
            {info?.componentStack ?? ""}
          </Code>
        </Alert>
        <Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => window.location.reload()}
          >
            إعادة تحميل
          </Button>
          <Button
            variant="default"
            onClick={() => this.setState({ error: null, info: null })}
          >
            محاولة أخرى
          </Button>
        </Group>
      </Stack>
    );
  }
}
