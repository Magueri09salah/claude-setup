import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  FileButton,
  Grid,
  Group,
  Image,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Category, Lesson, Sign } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

export function LessonsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // category modal
  const [catModal, setCatModal] = useState(false);
  const [catTitle, setCatTitle] = useState("");
  const [catParent, setCatParent] = useState<string | null>(null);
  const [catPremium, setCatPremium] = useState(false);

  // sign form
  const [name, setName] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sign | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const r = await api<{ categories: Category[] }>("/admin/categories");
      setCategories(r.categories);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const selectCategory = async (c: Category) => {
    setSelectedCat(c);
    setSelectedLesson(null);
    setSigns([]);
    try {
      const r = await api<{ lessons: Lesson[] }>(
        `/admin/lessons?categoryId=${c.id}`,
      );
      setLessons(r.lessons);
    } catch (e) {
      notifyError(e);
    }
  };

  const selectLesson = async (l: Lesson) => {
    setSelectedLesson(l);
    resetForm();
    try {
      const r = await api<{ signs: Sign[] }>(`/admin/lessons/${l.id}/signs`);
      setSigns(r.signs);
      const keys = r.signs.map((s) => s.imageKey);
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
  };

  const resetForm = () => {
    setName("");
    setImageKey(null);
    setAudioKey(null);
  };

  const createCategory = async () => {
    try {
      await api("/admin/categories", {
        method: "POST",
        json: {
          title: catTitle.trim(),
          parentId: catParent ? Number(catParent) : null,
          isPremium: catPremium,
        },
      });
      setCatModal(false);
      setCatTitle("");
      setCatParent(null);
      setCatPremium(false);
      notifySuccess("تم الإنشاء", "تمت إضافة الفئة");
      await loadCategories();
    } catch (e) {
      notifyError(e);
    }
  };

  const createLesson = async () => {
    if (!selectedCat) return;
    const title = prompt("عنوان الدرس (مثل: علامات المنع):");
    if (!title?.trim()) return;
    try {
      await api("/admin/lessons", {
        method: "POST",
        json: { categoryId: selectedCat.id, title: title.trim() },
      });
      notifySuccess("تم الإنشاء", "تمت إضافة الدرس");
      await selectCategory(selectedCat);
    } catch (e) {
      notifyError(e);
    }
  };

  const upload = async (file: File | null, kind: "image" | "audio") => {
    if (!file || !selectedLesson) return;
    const setBusy = kind === "image" ? setUploadingImage : setUploadingAudio;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("lessonId", String(selectedLesson.id));
      fd.append("slot", String(signs.length + 1));
      fd.append("file", file);
      const r = await api<{ key: string }>("/admin/upload", {
        method: "POST",
        formData: fd,
      });
      if (kind === "image") setImageKey(r.key);
      else setAudioKey(r.key);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const addSign = async () => {
    if (!selectedLesson || !name.trim() || !imageKey) return;
    setSaving(true);
    try {
      await api(`/admin/lessons/${selectedLesson.id}/signs`, {
        method: "POST",
        json: { name: name.trim(), imageKey, audioKey: audioKey ?? null },
      });
      notifySuccess("تمت الإضافة", `أُضيفت العلامة «${name.trim()}»`);
      await selectLesson(selectedLesson);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!selectedLesson) return;
    const target = index + delta;
    if (target < 0 || target >= signs.length) return;
    const next = [...signs];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setSigns(next);
    try {
      await api(`/admin/lessons/${selectedLesson.id}/signs/reorder`, {
        method: "POST",
        json: { orderedIds: next.map((s) => s.id) },
      });
    } catch (e) {
      notifyError(e);
      await selectLesson(selectedLesson);
    }
  };

  const deleteSign = async () => {
    if (!deleteTarget || !selectedLesson) return;
    try {
      await api(`/admin/signs/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      notifySuccess("تم الحذف", "حُذفت العلامة");
      await selectLesson(selectedLesson);
    } catch (e) {
      notifyError(e);
    }
  };

  const topCats = categories.filter((c) => !c.parentId);
  const childrenOf = (id: number) => categories.filter((c) => c.parentId === id);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>الدروس</Title>
        <Button onClick={() => setCatModal(true)}>فئة جديدة</Button>
      </Group>

      <Grid gutter="lg">
        {/* Categories tree */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder radius="lg" padding="md">
            <Text fw={700} mb="sm">
              الفئات
            </Text>
            <Stack gap={4}>
              {topCats.map((c) => (
                <div key={c.id}>
                  <Button
                    fullWidth
                    justify="space-between"
                    variant={selectedCat?.id === c.id ? "light" : "subtle"}
                    color={c.isPremium ? "yellow" : undefined}
                    onClick={() => void selectCategory(c)}
                  >
                    {c.title} {c.isPremium ? "🔒" : ""}
                  </Button>
                  {childrenOf(c.id).map((ch) => (
                    <Button
                      key={ch.id}
                      fullWidth
                      justify="space-between"
                      variant={selectedCat?.id === ch.id ? "light" : "subtle"}
                      size="compact-sm"
                      mr="md"
                      onClick={() => void selectCategory(ch)}
                    >
                      ↳ {ch.title} {ch.isPremium ? "🔒" : ""}
                    </Button>
                  ))}
                </div>
              ))}
              {topCats.length === 0 && (
                <Text c="dimmed" size="sm">
                  لا توجد فئات بعد.
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Lessons of category */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder radius="lg" padding="md">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>دروس {selectedCat ? `«${selectedCat.title}»` : ""}</Text>
              <Button
                size="compact-sm"
                variant="light"
                disabled={!selectedCat}
                onClick={() => void createLesson()}
              >
                + درس
              </Button>
            </Group>
            <Stack gap={4}>
              {lessons.map((l) => (
                <Button
                  key={l.id}
                  fullWidth
                  variant={selectedLesson?.id === l.id ? "light" : "subtle"}
                  justify="space-between"
                  onClick={() => void selectLesson(l)}
                >
                  {l.title}
                  <Badge size="sm" variant="light">
                    {l._count?.signs ?? 0}
                  </Badge>
                </Button>
              ))}
              {selectedCat && lessons.length === 0 && (
                <Text c="dimmed" size="sm">
                  لا توجد دروس في هذه الفئة.
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Sign editor */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="lg" padding="lg">
            <Text fw={700} mb="sm">
              علامات {selectedLesson ? `«${selectedLesson.title}»` : "— اختر درساً"}
            </Text>

            {selectedLesson && (
              <>
                <Table highlightOnHover mb="md" verticalSpacing="xs">
                  <Table.Tbody>
                    {signs.map((s, i) => (
                      <Table.Tr key={s.id}>
                        <Table.Td w={40}>{s.orderNum}</Table.Td>
                        <Table.Td w={56}>
                          <Image
                            src={thumbs[s.imageKey]}
                            w={40}
                            h={40}
                            fit="contain"
                            radius="sm"
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.name}</Text>
                        </Table.Td>
                        <Table.Td w={50}>{s.audioKey ? "🔊" : "—"}</Table.Td>
                        <Table.Td w={130}>
                          <Group gap={4} wrap="nowrap">
                            <ActionIcon
                              variant="subtle"
                              disabled={i === 0}
                              onClick={() => void move(i, -1)}
                            >
                              ↑
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              disabled={i === signs.length - 1}
                              onClick={() => void move(i, 1)}
                            >
                              ↓
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => setDeleteTarget(s)}
                            >
                              ✕
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {signs.length === 0 && (
                  <Text c="dimmed" size="sm" mb="md">
                    لا توجد علامات بعد — أضف الأولى بالأسفل.
                  </Text>
                )}

                <Stack gap="sm">
                  <TextInput
                    label="اسم العلامة"
                    placeholder="مثل: ممنوع تجاوز 60 كلم"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                  <Group grow align="flex-end">
                    <FileButton
                      onChange={(f) => void upload(f, "image")}
                      accept="image/webp,image/png,image/jpeg"
                    >
                      {(props) => (
                        <Button {...props} variant="light" loading={uploadingImage}>
                          {imageKey ? "✓ الصورة" : "رفع صورة *"}
                        </Button>
                      )}
                    </FileButton>
                    <FileButton
                      onChange={(f) => void upload(f, "audio")}
                      accept="audio/mpeg"
                    >
                      {(props) => (
                        <Button {...props} variant="light" loading={uploadingAudio}>
                          {audioKey ? "✓ الصوت" : "رفع صوت (اختياري)"}
                        </Button>
                      )}
                    </FileButton>
                  </Group>
                  <Button
                    loading={saving}
                    disabled={!name.trim() || !imageKey}
                    onClick={() => void addSign()}
                  >
                    إضافة العلامة
                  </Button>
                </Stack>
              </>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* New category modal */}
      <Modal opened={catModal} onClose={() => setCatModal(false)} title="فئة جديدة" centered>
        <Stack>
          <TextInput
            label="العنوان"
            value={catTitle}
            onChange={(e) => setCatTitle(e.currentTarget.value)}
          />
          <Select
            label="الفئة الأم (اختياري)"
            clearable
            data={topCats.map((c) => ({ value: String(c.id), label: c.title }))}
            value={catParent}
            onChange={setCatParent}
          />
          <Checkbox
            label="فئة مدفوعة (مقفلة للمستخدمين المجانيين)"
            checked={catPremium}
            onChange={(e) => setCatPremium(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCatModal(false)}>
              إلغاء
            </Button>
            <Button disabled={!catTitle.trim()} onClick={() => void createCategory()}>
              إنشاء
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete confirm */}
      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف العلامة"
        centered
      >
        <Text size="sm">هل أنت متأكد من حذف هذه العلامة؟ لا يمكن التراجع.</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
          <Button color="red" onClick={() => void deleteSign()}>
            حذف
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
