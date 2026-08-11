import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBroadcast,
  IconClock,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { LivePreview, LiveSettings } from "../api/types";
import { formatCasablanca } from "../casablanca";
import { notifyError, notifySuccess } from "../notify";

type UrlField = "youtubeUrl" | "facebookUrl" | "instagramUrl" | "tiktokUrl";

const PLATFORMS: {
  field: UrlField;
  label: string;
  icon: Icon;
  color: string;
  placeholder: string;
}[] = [
  {
    field: "youtubeUrl",
    label: "يوتيوب",
    icon: IconBrandYoutube,
    color: "#FF0000",
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    field: "facebookUrl",
    label: "فيسبوك",
    icon: IconBrandFacebook,
    color: "#1877F2",
    placeholder: "https://facebook.com/your-page",
  },
  {
    field: "instagramUrl",
    label: "إنستغرام",
    icon: IconBrandInstagram,
    color: "#E1306C",
    placeholder: "https://instagram.com/your-profile",
  },
  {
    field: "tiktokUrl",
    label: "تيك توك",
    icon: IconBrandTiktok,
    color: "#000000",
    placeholder: "https://tiktok.com/@your-profile",
  },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function LivesPage() {
  const [settings, setSettings] = useState<LiveSettings | null>(null);
  const [preview, setPreview] = useState<LivePreview | null>(null);
  const [urls, setUrls] = useState<Record<UrlField, string>>({
    youtubeUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
  });
  const [startTime, setStartTime] = useState("23:00");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const apply = useCallback((r: { settings: LiveSettings; preview: LivePreview }) => {
    setSettings(r.settings);
    setPreview(r.preview);
    setUrls({
      youtubeUrl: r.settings.youtubeUrl ?? "",
      facebookUrl: r.settings.facebookUrl ?? "",
      instagramUrl: r.settings.instagramUrl ?? "",
      tiktokUrl: r.settings.tiktokUrl ?? "",
    });
    setStartTime(r.settings.startTime);
    setEnabled(r.settings.enabled);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(
        await api<{ settings: LiveSettings; preview: LivePreview }>(
          "/admin/live-settings",
        ),
      );
    } catch (e) {
      notifyError(e);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const timeValid = TIME_RE.test(startTime);

  const save = async () => {
    if (!timeValid) return;
    setSaving(true);
    try {
      apply(
        await api<{ settings: LiveSettings; preview: LivePreview }>(
          "/admin/live-settings",
          { method: "PUT", json: { ...urls, startTime, enabled } },
        ),
      );
      notifySuccess("تم الحفظ", "تم تحديث إعدادات البث المباشر");
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const notifyNow = async () => {
    setNotifying(true);
    try {
      const r = await api<{ reach: number }>(
        "/admin/live-settings/notify-now",
        { method: "POST" },
      );
      notifySuccess("تم الإرسال", `وصل الإشعار إلى ${r.reach} جهاز`);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setNotifying(false);
    }
  };

  if (!settings) {
    return (
      <Stack>
        <Title order={3}>البث المباشر</Title>
        <Skeleton h={320} radius="lg" />
      </Stack>
    );
  }

  const filled = PLATFORMS.filter((p) => urls[p.field].trim() !== "").length;

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>البث المباشر</Title>
        <Group>
          {preview?.isLive && (
            <Badge color="red" variant="filled">
              مباشر الآن
            </Badge>
          )}
          <Button
            variant="light"
            leftSection={<IconBroadcast size={16} />}
            loading={notifying}
            onClick={() => void notifyNow()}
          >
            إرسال إشعار الآن
          </Button>
        </Group>
      </Group>

      <Alert variant="light" color="blue" title="كيف يعمل">
        البث يتكرر كل يوم في نفس الوقت. ضع رابط حسابك في كل منصة مرة واحدة —
        سيظهر للمترشحين في الصفحة الرئيسية على شكل أربعة أزرار تومض عند اقتراب
        الموعد، والضغط على أي زر يفتح حسابك مباشرة. يصل إشعار تذكيري قبل 15
        دقيقة وإشعار آخر عند بداية البث.
      </Alert>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="lg" padding="lg">
            <Text fw={700} mb="xs">
              روابط المنصات
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              اترك الحقل فارغاً لإخفاء المنصة من التطبيق.
            </Text>
            <Stack gap="md">
              {PLATFORMS.map((p) => (
                <TextInput
                  key={p.field}
                  // The brand mark belongs to the label, not inside the field:
                  // in an RTL page a leftSection sits where a right-aligned url
                  // ends, and the two overlapped.
                  label={
                    <Group gap={6} align="center">
                      <p.icon size={16} color={p.color} />
                      <span>{p.label}</span>
                    </Group>
                  }
                  placeholder={p.placeholder}
                  // Urls are always LTR and read left-to-right, whatever the
                  // surrounding page direction.
                  dir="ltr"
                  styles={{ input: { textAlign: "left" } }}
                  value={urls[p.field]}
                  onChange={(e) => {
                    // Read the value HERE, not inside the updater below:
                    // React clears `currentTarget` once the handler returns,
                    // and the updater runs later — reading it there threw on
                    // paste/clear, which took the whole panel down.
                    const value = e.currentTarget.value;
                    setUrls((prev) => ({ ...prev, [p.field]: value }));
                  }}
                />
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack>
            <Card withBorder radius="lg" padding="lg">
              <Text fw={700} mb="md">
                الموعد
              </Text>
              <Stack gap="md">
                <TextInput
                  // Native time picker: it emits exactly "HH:mm", which is the
                  // format the API stores, so no parsing or locale guessing.
                  type="time"
                  label={
                    <Group gap={6} align="center">
                      <IconClock size={16} />
                      <span>وقت البث اليومي</span>
                    </Group>
                  }
                  description="بتوقيت الدار البيضاء"
                  dir="ltr"
                  w={160}
                  styles={{ input: { textAlign: "left" } }}
                  value={startTime}
                  onChange={(e) => setStartTime(e.currentTarget.value)}
                  error={!timeValid ? "اختر وقتاً صالحاً" : undefined}
                />
                <Switch
                  label="تفعيل البث المباشر في التطبيق"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.currentTarget.checked)}
                />
              </Stack>
            </Card>

            <Card withBorder radius="lg" padding="lg">
              <Text fw={700} mb="md">
                الحالة
              </Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    المنصات المفعّلة
                  </Text>
                  <Text size="sm" fw={600}>
                    {filled} / 4
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    البث القادم
                  </Text>
                  <Text size="sm" fw={600}>
                    {preview ? formatCasablanca(preview.nextStartAt) : "—"}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    آخر إشعار وصل إلى
                  </Text>
                  <Text size="sm" fw={600}>
                    {settings.lastPushReach} جهاز
                  </Text>
                </Group>
                {!preview?.enabled && (
                  <Text size="xs" c="orange" mt="xs">
                    لن يظهر البث في التطبيق: أضف رابطاً واحداً على الأقل وفعّل
                    الخيار أعلاه.
                  </Text>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Group justify="flex-end">
        <Button loading={saving} disabled={!timeValid} onClick={() => void save()}>
          حفظ الإعدادات
        </Button>
      </Group>
    </Stack>
  );
}
