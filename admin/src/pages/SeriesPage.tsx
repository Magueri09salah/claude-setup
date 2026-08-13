import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { LicenceCategory, Series } from "../api/types";
import { LICENCES, licenceLabel } from "../licence";
import { notifyError, notifySuccess } from "../notify";

export function SeriesPage() {
  // One licence at a time: series are numbered per category, so mixing them in
  // a single list would make the order column meaningless.
  const [tab, setTab] = useState<LicenceCategory>("B");
  const [search, setSearch] = useState("");
  const [series, setSeries] = useState<Series[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LicenceCategory>("B");
  const [isPremium, setIsPremium] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Series | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setSeries(null);
    try {
      const r = await api<{ series: Series[] }>(
        `/admin/series?category=${tab}`,
      );
      setSeries(r.series);
    } catch (e) {
      notifyError(e);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setCategory(tab); // a new series lands in the licence you are viewing
    setIsPremium(true);
    setModalOpen(true);
  };

  const openEdit = (s: Series) => {
    setEditing(s);
    setTitle(s.title);
    setCategory(s.category);
    setIsPremium(s.isPremium);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api(`/admin/series/${editing.id}`, {
          method: "PATCH",
          json: { title: title.trim(), isPremium, category },
        });
        notifySuccess("تم الحفظ", "تم تحديث السلسلة");
      } else {
        await api("/admin/series", {
          method: "POST",
          json: { title: title.trim(), isPremium, category },
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

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/admin/series/${deleteTarget.id}`, { method: "DELETE" });
      notifySuccess("تم الحذف", "حُذفت السلسلة وأسئلتها");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setDeleting(false);
    }
  };

  // Matches the title or the order number ("3" finds السلسلة الثالثة).
  const query = search.trim().toLowerCase();
  const visible = (series ?? []).filter(
    (s) =>
      query === "" ||
      s.title.toLowerCase().includes(query) ||
      String(s.orderNum) === query,
  );
  // Reordering moves a row relative to its NEIGHBOURS. While a filter hides
  // rows those neighbours are not the real ones, so the arrows would silently
  // reorder the wrong series — disable them until the filter is cleared.
  const canReorder = query === "";

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>السلاسل</Title>
        <Button onClick={openCreate}>سلسلة جديدة</Button>
      </Group>

      <Tabs
        value={tab}
        onChange={(v) => {
          if (!v) return;
          setTab(v as LicenceCategory);
          setSearch(""); // a query from one licence means nothing in another
        }}
        variant="outline"
      >
        <Tabs.List>
          {LICENCES.map((l) => (
            <Tabs.Tab
              key={l.value}
              value={l.value}
              leftSection={<l.icon size={16} />}
            >
              {licenceLabel(l.value)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <TextInput
        placeholder="ابحث عن سلسلة بالاسم أو الرقم…"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={360}
      />

      {!series ? (
        <Stack gap="xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={44} radius="md" />
          ))}
        </Stack>
      ) : visible.length === 0 ? (
        <Text c="dimmed">
          {search.trim()
            ? `لا توجد سلسلة تطابق «${search.trim()}» في هذا الصنف.`
            : `لا توجد سلاسل في صنف «${licenceLabel(tab)}» — أنشئ السلسلة الأولى.`}
        </Text>
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
            {visible.map((s, i) => (
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
                      disabled={!canReorder || i === 0}
                      aria-label="تحريك لأعلى"
                      title={canReorder ? "تحريك لأعلى" : "امسح البحث لإعادة الترتيب"}
                      onClick={() => void move(i, -1)}
                    >
                      ↑
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      disabled={!canReorder || i === visible.length - 1}
                      aria-label="تحريك لأسفل"
                      title={canReorder ? "تحريك لأسفل" : "امسح البحث لإعادة الترتيب"}
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
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteTarget(s)}
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
          <Select
            label="صنف الرخصة"
            description="سلاسل كل صنف مستقلة وتظهر في قسمها داخل التطبيق"
            data={LICENCES.map((l) => ({
              value: l.value,
              label: licenceLabel(l.value),
            }))}
            value={category}
            onChange={(v) => v && setCategory(v as LicenceCategory)}
            allowDeselect={false}
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

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف السلسلة"
        centered
      >
        <Text size="sm">
          سيتم حذف «{deleteTarget?.title}» مع{" "}
          <b>{deleteTarget?._count?.questions ?? 0} سؤالاً</b> بشكل نهائي. لا يمكن
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
