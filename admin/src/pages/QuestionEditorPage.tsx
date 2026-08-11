import {
  Badge,
  Button,
  Card,
  Checkbox,
  FileButton,
  Grid,
  Group,
  Image,
  Modal,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl } from "../api/client";
import type { Question, Series } from "../api/types";
import { LICENCES, licence, licenceLabel } from "../licence";
import { notifyError, notifySuccess } from "../notify";

type AnswersCount = "2" | "3" | "4";

export function QuestionEditorPage() {
  const [seriesList, setSeriesList] = useState<Series[] | null>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [orderNum, setOrderNum] = useState<number | string>(1);
  const [answersCount, setAnswersCount] = useState<AnswersCount>("4");
  const [correct, setCorrect] = useState<string[]>([]);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [correctionAudioKey, setCorrectionAudioKey] = useState<string | null>(
    null,
  );
  const [correctionAudioUrl, setCorrectionAudioUrl] = useState<string | null>(
    null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCorrection, setUploadingCorrection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedSeries =
    seriesList?.find((s) => String(s.id) === seriesId) ?? null;

  const loadSeries = useCallback(async () => {
    try {
      const r = await api<{ series: Series[] }>("/admin/series");
      setSeriesList(r.series);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  const resetForm = useCallback((existing: Question[]) => {
    const nextOrder =
      existing.length > 0
        ? Math.max(...existing.map((q) => q.orderNum)) + 1
        : 1;
    setEditingId(null);
    setOrderNum(nextOrder);
    setAnswersCount("4");
    setCorrect([]);
    setImageKey(null);
    setImageUrl(null);
    setAudioKey(null);
    setAudioUrl(null);
    setCorrectionText("");
    setCorrectionAudioKey(null);
    setCorrectionAudioUrl(null);
  }, []);

  const selectSeries = useCallback(
    async (value: string | null) => {
      setSeriesId(value);
      setQuestions(null);
      if (!value) return;
      try {
        const r = await api<{ questions: Question[] }>(
          `/admin/questions?seriesId=${value}`,
        );
        setQuestions(r.questions);
        resetForm(r.questions);
      } catch (e) {
        notifyError(e);
      }
    },
    [resetForm],
  );

  const editQuestion = (q: Question) => {
    setEditingId(q.id);
    setOrderNum(q.orderNum);
    setAnswersCount(String(q.answersCount) as AnswersCount);
    setCorrect(q.correctAnswers.map(String));
    setImageKey(q.imageKey);
    setAudioKey(q.audioKey);
    setCorrectionText(q.correctionText ?? "");
    setCorrectionAudioKey(q.correctionAudioKey);
    setImageUrl(null);
    setAudioUrl(null);
    setCorrectionAudioUrl(null);
    api<{
      question: Question;
      imageUrl: string;
      audioUrl: string;
      correctionAudioUrl: string | null;
    }>(`/admin/questions/${q.id}`)
      .then((r) => {
        setImageUrl(r.imageUrl);
        setAudioUrl(r.audioUrl);
        setCorrectionAudioUrl(r.correctionAudioUrl);
      })
      .catch(notifyError);
  };

  const changeAnswersCount = (value: string) => {
    setAnswersCount(value as AnswersCount);
    setCorrect((prev) => prev.filter((n) => Number(n) <= Number(value)));
  };

  const uploadFile = async (
    file: File | null,
    kind: "image" | "audio" | "correction",
  ) => {
    if (!file || !seriesId || orderNum === "") return;
    const setBusy =
      kind === "image"
        ? setUploadingImage
        : kind === "audio"
          ? setUploadingAudio
          : setUploadingCorrection;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("seriesId", seriesId);
      fd.append("orderNum", String(orderNum));
      // Correction audio gets its own base key so it never collides with the
      // question's own audio.
      if (kind === "correction") fd.append("purpose", "correction");
      fd.append("file", file);
      const r = await api<{ key: string; url: string }>("/admin/upload", {
        method: "POST",
        formData: fd,
      });
      if (kind === "image") {
        setImageKey(r.key);
        setImageUrl(r.url);
      } else if (kind === "audio") {
        setAudioKey(r.key);
        setAudioUrl(r.url);
      } else {
        setCorrectionAudioKey(r.key);
        setCorrectionAudioUrl(r.url);
      }
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const togglePremium = async (value: boolean) => {
    if (!selectedSeries) return;
    try {
      await api(`/admin/series/${selectedSeries.id}`, {
        method: "PATCH",
        json: { isPremium: value },
      });
      await loadSeries();
    } catch (e) {
      notifyError(e);
    }
  };

  const canSave =
    seriesId !== null &&
    orderNum !== "" &&
    imageKey !== null &&
    audioKey !== null &&
    correct.length > 0;

  const save = async () => {
    if (!canSave || !seriesId || !imageKey || !audioKey) return;
    setSaving(true);
    const payload = {
      orderNum: Number(orderNum),
      answersCount: Number(answersCount),
      correctAnswers: correct.map(Number).sort((a, b) => a - b),
      imageKey,
      audioKey,
      correctionText: correctionText.trim(),
      correctionAudioKey,
    };
    try {
      if (editingId !== null) {
        await api(`/admin/questions/${editingId}`, {
          method: "PATCH",
          json: payload,
        });
        notifySuccess("تم الحفظ", `تم تحديث السؤال رقم ${payload.orderNum}`);
      } else {
        const r = await api<{ question: Question }>("/admin/questions", {
          method: "POST",
          json: { ...payload, seriesId: Number(seriesId) },
        });
        setEditingId(r.question.id);
        notifySuccess("تم الإنشاء", `تم إنشاء السؤال رقم ${payload.orderNum}`);
      }
      const list = await api<{ questions: Question[] }>(
        `/admin/questions?seriesId=${seriesId}`,
      );
      setQuestions(list.questions);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || !seriesId) return;
    setDeleting(true);
    try {
      await api(`/admin/questions/${deleteTarget.id}`, { method: "DELETE" });
      notifySuccess("تم الحذف", `حُذف السؤال رقم ${deleteTarget.orderNum}`);
      if (editingId === deleteTarget.id) resetForm(questions ?? []);
      setDeleteTarget(null);
      const list = await api<{ questions: Question[] }>(
        `/admin/questions?seriesId=${seriesId}`,
      );
      setQuestions(list.questions);
    } catch (e) {
      notifyError(e);
    } finally {
      setDeleting(false);
    }
  };

  const answerOptions = Array.from(
    { length: Number(answersCount) },
    (_, i) => String(i + 1),
  );

  // Drives the cards directly, so what you search is exactly what you see.
  // Matches the title or the order number ("3" finds السلسلة الثالثة).
  const query = search.trim().toLowerCase();
  const filteredSeries = (seriesList ?? []).filter(
    (s) =>
      query === "" ||
      s.title.toLowerCase().includes(query) ||
      String(s.orderNum) === query,
  );

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>محرر الأسئلة</Title>
        {selectedSeries && (
          <Group align="center">
            <Switch
              label="سلسلة مدفوعة"
              checked={selectedSeries.isPremium}
              onChange={(e) => void togglePremium(e.currentTarget.checked)}
            />
            <Button
              variant="default"
              onClick={() => {
                // Reload so the counts on the cards reflect questions just
                // added or deleted.
                void loadSeries();
                void selectSeries(null);
              }}
            >
              تغيير السلسلة
            </Button>
          </Group>
        )}
      </Group>

      {!seriesId ? (
        /* Series picker: cards instead of a dropdown, with a search box that
           filters exactly what is on screen. */
        <>
          <TextInput
            placeholder="ابحث عن سلسلة بالاسم أو الرقم…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            maw={420}
          />

          {seriesList === null ? (
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={120} radius="lg" />
              ))}
            </SimpleGrid>
          ) : filteredSeries.length === 0 ? (
            <Text c="dimmed">
              {search.trim()
                ? `لا توجد سلسلة تطابق «${search.trim()}».`
                : "لا توجد سلاسل بعد — أنشئها من صفحة السلاسل."}
            </Text>
          ) : (
            LICENCES.flatMap((l) => {
              const group = filteredSeries.filter((x) => x.category === l.value);
              if (group.length === 0) return [];
              return [
                <Stack key={l.value} gap="sm">
                  <Group gap="xs">
                    <l.icon size={16} />
                    <Text fw={600} fz="sm">
                      {licenceLabel(l.value)}
                    </Text>
                    <Badge size="sm" variant="light">
                      {group.length}
                    </Badge>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
                    {group.map((s) => (
                      <Card
                        key={s.id}
                        padding="lg"
                        withBorder
                        radius="lg"
                        style={{ cursor: "pointer" }}
                        onClick={() => void selectSeries(String(s.id))}
                      >
                        <Group justify="space-between" mb="xs">
                          <Badge variant="light" color={licence(s.category).color}>
                            {s.orderNum}
                          </Badge>
                          {s.isPremium && (
                            <Badge variant="light" color="grape" size="sm">
                              مدفوعة
                            </Badge>
                          )}
                        </Group>
                        <Text fw={600} lineClamp={2}>
                          {s.title}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {s._count?.questions ?? 0} سؤال
                        </Text>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Stack>,
              ];
            })
          )}
        </>
      ) : (
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm">
                <Text fw={700}>الأسئلة</Text>
                <Button
                  size="compact-sm"
                  variant="light"
                  onClick={() => questions && resetForm(questions)}
                >
                  سؤال جديد
                </Button>
              </Group>
              {!questions ? (
                <Stack gap="xs">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} h={36} radius="sm" />
                  ))}
                </Stack>
              ) : questions.length === 0 ? (
                <Text c="dimmed" size="sm">
                  لا توجد أسئلة بعد.
                </Text>
              ) : (
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={50}>#</Table.Th>
                      <Table.Th>الأجوبة الصحيحة</Table.Th>
                      <Table.Th w={100}>عدد الأجوبة</Table.Th>
                      <Table.Th w={120} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {questions.map((q) => (
                      <Table.Tr
                        key={q.id}
                        bg={
                          q.id === editingId
                            ? "var(--mantine-color-zinc-1)"
                            : undefined
                        }
                      >
                        <Table.Td>{q.orderNum}</Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {q.correctAnswers.map((a) => (
                              <Badge key={a} size="sm" variant="light">
                                {a}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>{q.answersCount}</Table.Td>
                        <Table.Td>
                          <Group gap={2} wrap="nowrap">
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              onClick={() => editQuestion(q)}
                            >
                              تعديل
                            </Button>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              color="red"
                              onClick={() => setDeleteTarget(q)}
                            >
                              حذف
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Text fw={700}>
                  {editingId !== null
                    ? `تعديل السؤال رقم ${orderNum}`
                    : "سؤال جديد"}
                </Text>
                <Group gap="xs">
                  {selectedSeries && (
                    <Badge variant="light" color={licence(selectedSeries.category).color}>
                      {licenceLabel(selectedSeries.category)}
                    </Badge>
                  )}
                  {selectedSeries?.isPremium && (
                    <Badge color="grape" variant="light">
                      سلسلة مدفوعة
                    </Badge>
                  )}
                </Group>
              </Group>
              <Stack>
                <Group grow align="flex-start">
                  <NumberInput
                    label="رقم الترتيب"
                    min={1}
                    value={orderNum}
                    onChange={setOrderNum}
                  />
                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      عدد الأجوبة
                    </Text>
                    <SegmentedControl
                      fullWidth
                      data={["2", "3", "4"]}
                      value={answersCount}
                      onChange={changeAnswersCount}
                    />
                  </div>
                </Group>

                <Checkbox.Group
                  label="الأجوبة الصحيحة"
                  description="حدد رقم كل جواب صحيح"
                  value={correct}
                  onChange={setCorrect}
                >
                  <Group mt="xs">
                    {answerOptions.map((n) => (
                      <Checkbox key={n} value={n} label={n} />
                    ))}
                  </Group>
                </Checkbox.Group>

                <Group align="flex-start" grow>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      صورة السؤال (3:4)
                    </Text>
                    {imageUrl ? (
                      <Image
                        src={mediaUrl(imageUrl ?? undefined)}
                        w={180}
                        h={240}
                        fit="cover"
                        radius="md"
                      />
                    ) : imageKey ? (
                      <Skeleton w={180} h={240} radius="md" />
                    ) : (
                      <Text size="xs" c="dimmed">
                        لم تُرفع أي صورة بعد.
                      </Text>
                    )}
                    <FileButton
                      onChange={(f) => void uploadFile(f, "image")}
                      accept="image/webp,image/png,image/jpeg"
                    >
                      {(props) => (
                        <Button
                          {...props}
                          variant="light"
                          loading={uploadingImage}
                          disabled={!seriesId || orderNum === ""}
                        >
                          رفع صورة
                        </Button>
                      )}
                    </FileButton>
                  </Stack>

                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      صوت السؤال (MP3)
                    </Text>
                    {audioUrl ? (
                      <audio controls src={mediaUrl(audioUrl ?? undefined)} style={{ width: "100%" }} />
                    ) : audioKey ? (
                      <Skeleton h={40} radius="md" />
                    ) : (
                      <Text size="xs" c="dimmed">
                        لم يُرفع أي ملف صوتي بعد.
                      </Text>
                    )}
                    <FileButton
                      onChange={(f) => void uploadFile(f, "audio")}
                      accept="audio/mpeg"
                    >
                      {(props) => (
                        <Button
                          {...props}
                          variant="light"
                          loading={uploadingAudio}
                          disabled={!seriesId || orderNum === ""}
                        >
                          رفع ملف صوتي
                        </Button>
                      )}
                    </FileButton>
                  </Stack>
                </Group>

                <Card withBorder radius="md" padding="md" bg="var(--mantine-color-zinc-0)">
                  <Text fw={600} size="sm" mb={2}>
                    التصحيح
                  </Text>
                  <Text size="xs" c="dimmed" mb="sm">
                    يظهر للمترشح في مرحلة التصحيح بعد انتهاء السلسلة فقط، وليس
                    أثناء الإجابة.
                  </Text>
                  <Stack gap="sm">
                    <Textarea
                      label="نص التصحيح"
                      placeholder="اشرح الجواب الصحيح…"
                      autosize
                      minRows={3}
                      maxRows={8}
                      maxLength={1000}
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.currentTarget.value)}
                    />
                    <div>
                      <Text size="sm" fw={500} mb={4}>
                        صوت التصحيح (MP3)
                      </Text>
                      {correctionAudioUrl ? (
                        <audio
                          controls
                          src={mediaUrl(correctionAudioUrl)}
                          style={{ width: "100%" }}
                        />
                      ) : correctionAudioKey ? (
                        <Skeleton h={40} radius="md" />
                      ) : (
                        <Text size="xs" c="dimmed">
                          لا يوجد صوت تصحيح (اختياري).
                        </Text>
                      )}
                      <Group gap="xs" mt="xs">
                        <FileButton
                          onChange={(f) => void uploadFile(f, "correction")}
                          accept="audio/mpeg"
                        >
                          {(props) => (
                            <Button
                              {...props}
                              variant="light"
                              size="compact-sm"
                              loading={uploadingCorrection}
                              disabled={!seriesId || orderNum === ""}
                            >
                              رفع صوت التصحيح
                            </Button>
                          )}
                        </FileButton>
                        {correctionAudioKey && (
                          <Button
                            variant="subtle"
                            color="red"
                            size="compact-sm"
                            onClick={() => {
                              setCorrectionAudioKey(null);
                              setCorrectionAudioUrl(null);
                            }}
                          >
                            حذف الصوت
                          </Button>
                        )}
                      </Group>
                    </div>
                  </Stack>
                </Card>

                <Group justify="flex-end">
                  <Button
                    loading={saving}
                    disabled={!canSave}
                    onClick={() => void save()}
                  >
                    {editingId !== null ? "حفظ التعديلات" : "إنشاء السؤال"}
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف السؤال"
        centered
      >
        <Text size="sm">
          سيتم حذف السؤال رقم <b>{deleteTarget?.orderNum}</b> نهائياً. لا يمكن
          التراجع. اضغط «نشر» بعد الحذف لتحديث التطبيقات.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
          <Button color="red" loading={deleting} onClick={() => void remove()}>
            حذف نهائي
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
