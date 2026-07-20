import {
  Badge,
  Button,
  Card,
  Checkbox,
  FileButton,
  Grid,
  Group,
  Image,
  NumberInput,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Question, Series } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

type AnswersCount = "2" | "3" | "4";

export function QuestionEditorPage() {
  const [seriesList, setSeriesList] = useState<Series[] | null>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [orderNum, setOrderNum] = useState<number | string>(1);
  const [answersCount, setAnswersCount] = useState<AnswersCount>("4");
  const [correct, setCorrect] = useState<string[]>([]);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setImageUrl(null);
    setAudioUrl(null);
    api<{ question: Question; imageUrl: string; audioUrl: string }>(
      `/admin/questions/${q.id}`,
    )
      .then((r) => {
        setImageUrl(r.imageUrl);
        setAudioUrl(r.audioUrl);
      })
      .catch(notifyError);
  };

  const changeAnswersCount = (value: string) => {
    setAnswersCount(value as AnswersCount);
    setCorrect((prev) => prev.filter((n) => Number(n) <= Number(value)));
  };

  const uploadFile = async (file: File | null, kind: "image" | "audio") => {
    if (!file || !seriesId || orderNum === "") return;
    const setBusy = kind === "image" ? setUploadingImage : setUploadingAudio;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("seriesId", seriesId);
      fd.append("orderNum", String(orderNum));
      fd.append("file", file);
      const r = await api<{ key: string; url: string }>("/admin/upload", {
        method: "POST",
        formData: fd,
      });
      if (kind === "image") {
        setImageKey(r.key);
        setImageUrl(r.url);
      } else {
        setAudioKey(r.key);
        setAudioUrl(r.url);
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

  const answerOptions = Array.from(
    { length: Number(answersCount) },
    (_, i) => String(i + 1),
  );

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Title order={3}>محرر الأسئلة</Title>
        <Group align="flex-end">
          <Select
            label="السلسلة"
            placeholder="اختر سلسلة"
            w={280}
            data={
              seriesList?.map((s) => ({
                value: String(s.id),
                label: `${s.orderNum}. ${s.title}`,
              })) ?? []
            }
            value={seriesId}
            onChange={(v) => void selectSeries(v)}
            searchable
          />
          <Switch
            label="سلسلة مدفوعة"
            checked={selectedSeries?.isPremium ?? false}
            disabled={!selectedSeries}
            onChange={(e) => void togglePremium(e.currentTarget.checked)}
            mb={6}
          />
        </Group>
      </Group>

      {!seriesId ? (
        <Text c="dimmed">اختر سلسلة لإدارة أسئلتها.</Text>
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
                      <Table.Th w={80} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {questions.map((q) => (
                      <Table.Tr
                        key={q.id}
                        bg={
                          q.id === editingId
                            ? "var(--mantine-color-brand-0)"
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
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            onClick={() => editQuestion(q)}
                          >
                            تعديل
                          </Button>
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
                {selectedSeries?.isPremium && (
                  <Badge color="grape" variant="light">
                    سلسلة مدفوعة
                  </Badge>
                )}
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
                        src={imageUrl}
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
                      <audio controls src={audioUrl} style={{ width: "100%" }} />
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
    </Stack>
  );
}
