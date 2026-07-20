import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Series } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

export function SeriesPage() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);
  const [title, setTitle] = useState("");
  const [isPremium, setIsPremium] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ series: Series[] }>("/admin/series");
      setSeries(r.series);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setIsPremium(true);
    setModalOpen(true);
  };

  const openEdit = (s: Series) => {
    setEditing(s);
    setTitle(s.title);
    setIsPremium(s.isPremium);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api(`/admin/series/${editing.id}`, {
          method: "PATCH",
          json: { title: title.trim(), isPremium },
        });
        notifySuccess("تم الحفظ", "تم تحديث السلسلة");
      } else {
        await api("/admin/series", {
          method: "POST",
          json: { title: title.trim(), isPremium },
        });
        notifySuccess("تم الإنشاء", "تمت إضافة السلسلة");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const togglePremium = async (s: Series, value: boolean) => {
    try {
      await api(`/admin/series/${s.id}`, {
        method: "PATCH",
        json: { isPremium: value },
      });
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!series) return;
    const target = index + delta;
    if (target < 0 || target >= series.length) return;
    const next = [...series];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setSeries(next);
    try {
      await api("/admin/series/reorder", {
        method: "POST",
        json: { orderedIds: next.map((s) => s.id) },
      });
      await load();
    } catch (e) {
      notifyError(e);
      await load();
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>السلاسل</Title>
        <Button onClick={openCreate}>سلسلة جديدة</Button>
      </Group>

      {!series ? (
        <Stack gap="xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={44} radius="md" />
          ))}
        </Stack>
      ) : series.length === 0 ? (
        <Text c="dimmed">لا توجد سلاسل بعد — أنشئ السلسلة الأولى.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={60}>#</Table.Th>
              <Table.Th>العنوان</Table.Th>
              <Table.Th w={140}>الاشتراك</Table.Th>
              <Table.Th w={110}>الأسئلة</Table.Th>
              <Table.Th w={150}>إجراءات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {series.map((s, i) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.orderNum}</Table.Td>
                <Table.Td>
                  <Text fw={500}>{s.title}</Text>
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={s.isPremium}
                    label={s.isPremium ? "مدفوعة" : "مجانية"}
                    onChange={(e) =>
                      void togglePremium(s, e.currentTarget.checked)
                    }
                  />
                </Table.Td>
                <Table.Td>{s._count?.questions ?? 0}</Table.Td>
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
                      disabled={i === series.length - 1}
                      aria-label="تحريك لأسفل"
                      onClick={() => void move(i, 1)}
                    >
                      ↓
                    </ActionIcon>
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openEdit(s)}
                    >
                      تعديل
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل السلسلة" : "سلسلة جديدة"}
        centered
      >
        <Stack>
          <TextInput
            label="العنوان"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
          <Switch
            label="سلسلة مدفوعة (مقفلة للمستخدمين المجانيين)"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              loading={saving}
              disabled={!title.trim()}
              onClick={() => void save()}
            >
              {editing ? "حفظ" : "إنشاء"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
