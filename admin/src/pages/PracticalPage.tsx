import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Progress,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconTrash,
  IconVideo,
  IconVideoPlus,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl, uploadWithProgress } from "../api/client";
import type { PracticalVideo } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} غ.ب` : `${mb.toFixed(1)} م.ب`;
}

export function PracticalPage() {
  const [videos, setVideos] = useState<PracticalVideo[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PracticalVideo | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ videos: PracticalVideo[] }>(
        "/admin/practical-videos",
      );
      setVideos(r.videos);
      const keys = r.videos
        .map((v) => v.thumbKey)
        .filter((k): k is string => !!k);
      if (keys.length > 0) {
        const u = await api<{ urls: Record<string, string> }>(
          "/admin/media-urls",
          { method: "POST", json: { keys } },
        );
        setThumbs(u.urls);
      } else {
        setThumbs({});
      }
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = () => {
    setTitle("");
    setFile(null);
    setPoster(null);
    setProgress(null);
    setModal(true);
  };

  const add = async () => {
    if (!title.trim() || !file) return;
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("file", file);
      if (poster) fd.append("thumb", poster);
      await uploadWithProgress("/admin/practical-videos", fd, setProgress);
      notifySuccess("تم الرفع", `أُضيف الفيديو «${title.trim()}»`);
      setModal(false);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setProgress(null);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!videos) return;
    const target = index + delta;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setVideos(next);
    try {
      await api("/admin/practical-videos/reorder", {
        method: "POST",
        json: { orderedIds: next.map((v) => v.id) },
      });
    } catch (e) {
      notifyError(e);
      await load();
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/practical-videos/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      notifySuccess("تم الحذف", "حُذف الفيديو");
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  const totalBytes = (videos ?? []).reduce(
    (sum, v) => sum + (v.sizeBytes ?? 0),
    0,
  );

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>الشق التطبيقي</Title>
        <Button leftSection={<IconVideoPlus size={16} />} onClick={openModal}>
          فيديو جديد
        </Button>
      </Group>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={18} />}
        title="كيف يعمل"
      >
        قائمة واحدة من فيديوهات السياقة التطبيقية، تظهر للمترشح كبطاقات من
        الصفحة الرئيسية في التطبيق. الترتيب هنا هو نفسه الترتيب عنده. الفيديوهات
        تُشغَّل عبر الإنترنت ولا تُحمَّل على الهاتف.
      </Alert>

      {videos && (
        <Group gap="xs">
          <Badge variant="light" leftSection={<IconVideo size={13} />}>
            {videos.length} فيديو
          </Badge>
          <Badge variant="light" color="gray">
            {formatBytes(totalBytes)} إجمالاً
          </Badge>
        </Group>
      )}

      {!videos ? (
        <Stack gap="xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={56} radius="md" />
          ))}
        </Stack>
      ) : videos.length === 0 ? (
        <Card padding="xl">
          <Stack align="center" gap="xs">
            <IconVideo size={32} color="var(--zinc-400)" />
            <Text c="dimmed">لا توجد فيديوهات بعد — اضغط «فيديو جديد».</Text>
          </Stack>
        </Card>
      ) : (
        <Card padding="lg">
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={50}>#</Table.Th>
                <Table.Th w={110}>الصورة</Table.Th>
                <Table.Th>العنوان</Table.Th>
                <Table.Th w={110}>الحجم</Table.Th>
                <Table.Th w={140}>إجراءات</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {videos.map((v, i) => (
                <Table.Tr key={v.id}>
                  <Table.Td>{i + 1}</Table.Td>
                  <Table.Td>
                    {v.thumbKey && thumbs[v.thumbKey] ? (
                      <Image
                        src={mediaUrl(thumbs[v.thumbKey])}
                        w={84}
                        h={48}
                        fit="cover"
                        radius="sm"
                      />
                    ) : (
                      <Group
                        w={84}
                        h={48}
                        justify="center"
                        bg="var(--zinc-100)"
                        style={{ borderRadius: 6 }}
                      >
                        <IconVideo size={18} color="var(--zinc-400)" />
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{v.title}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {formatBytes(v.sizeBytes)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        disabled={i === 0}
                        aria-label="تحريك لأعلى"
                        onClick={() => void move(i, -1)}
                      >
                        ↑
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        disabled={i === videos.length - 1}
                        aria-label="تحريك لأسفل"
                        onClick={() => void move(i, 1)}
                      >
                        ↓
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="حذف"
                        onClick={() => setDeleteTarget(v)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal
        opened={modal}
        onClose={() => progress === null && setModal(false)}
        title="فيديو تطبيقي جديد"
        centered
        closeOnClickOutside={progress === null}
      >
        <Stack>
          <TextInput
            label="عنوان الفيديو"
            placeholder="مثل: الوقوف بين سيارتين"
            data-autofocus
            value={title}
            disabled={progress !== null}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />

          <div>
            <Text size="sm" fw={500} mb={4}>
              ملف الفيديو
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
              MP4 أو MOV، بحد أقصى 500 ميغابايت.
            </Text>
            <Group gap="xs">
              <Button
                component="label"
                variant="light"
                size="compact-sm"
                disabled={progress !== null}
              >
                {file ? "تغيير الملف" : "اختيار ملف"}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  hidden
                  onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                />
              </Button>
              {file && (
                <Text size="xs" c="dimmed">
                  {file.name} · {formatBytes(file.size)}
                </Text>
              )}
            </Group>
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              صورة الغلاف (اختيارية)
            </Text>
            <Group gap="xs">
              <Button
                component="label"
                variant="light"
                size="compact-sm"
                disabled={progress !== null}
              >
                {poster ? "تغيير الصورة" : "اختيار صورة"}
                <input
                  type="file"
                  accept="image/webp,image/png,image/jpeg"
                  hidden
                  onChange={(e) => setPoster(e.currentTarget.files?.[0] ?? null)}
                />
              </Button>
              {poster && (
                <Text size="xs" c="dimmed">
                  {poster.name}
                </Text>
              )}
            </Group>
          </div>

          {progress !== null && (
            <div>
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">
                  {progress >= 1 ? "جارٍ الحفظ…" : "جارٍ الرفع…"}
                </Text>
                <Text size="xs" fw={600}>
                  {Math.round(progress * 100)}%
                </Text>
              </Group>
              <Progress value={progress * 100} animated />
            </div>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={progress !== null}
              onClick={() => setModal(false)}
            >
              إلغاء
            </Button>
            <Button
              loading={progress !== null}
              disabled={!title.trim() || !file}
              onClick={() => void add()}
            >
              رفع الفيديو
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف الفيديو"
        centered
      >
        <Text size="sm">
          سيُحذف «{deleteTarget?.title}» نهائياً من الشق التطبيقي.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
          <Button color="red" onClick={() => void remove()}>
            حذف نهائي
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
