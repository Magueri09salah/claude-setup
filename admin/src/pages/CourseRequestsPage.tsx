import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBrandWhatsapp,
  IconFileSpreadsheet,
  IconMapPin,
  IconPrinter,
  IconSchool,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { CourseRequest, CourseRequestStatus } from "../api/types";
import { formatCasablanca } from "../casablanca";
import { exportExcel, exportPdf, type ExportColumn } from "../export";
import { notifyError, notifySuccess } from "../notify";

const STATUS_META: Record<
  CourseRequestStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "جديد", color: "yellow" },
  CONTACTED: { label: "تم التواصل", color: "blue" },
  ENROLLED: { label: "مسجّل", color: "green" },
  CANCELLED: { label: "ملغى", color: "gray" },
};

const STATUS_OPTIONS = (
  Object.keys(STATUS_META) as CourseRequestStatus[]
).map((value) => ({ value, label: STATUS_META[value].label }));

/** Local 0XXXXXXXXX → wa.me's 212XXXXXXXXX. */
function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("212") ? `0${digits.slice(3)}` : digits;
  if (!/^0\d{9}$/.test(local)) return null;
  return `https://wa.me/212${local.slice(1)}`;
}

// Leads from the mobile "التسجيل في الدروس" screen: who wants driving lessons,
// and where. The city counts are the point of the page — they say where the
// next partner school is worth opening.
export function CourseRequestsPage() {
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CourseRequestStatus>("all");
  const [city, setCity] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [target, setTarget] = useState<CourseRequest | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set("search", search.trim());
      if (city) params.set("city", city);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await api<{
        requests: CourseRequest[];
        cities: { city: string; count: number }[];
      }>(`/admin/course-requests?${params.toString()}`);
      setRequests(r.requests);
      setCities(r.cities);
    } catch (e) {
      notifyError(e);
    }
  }, [search, status, city, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatusOf = async (
    request: CourseRequest,
    next: CourseRequestStatus,
  ) => {
    try {
      await api(`/admin/course-requests/${request.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      notifySuccess("تم التحديث", `${request.city} — ${STATUS_META[next].label}`);
      void load();
    } catch (e) {
      notifyError(e);
    }
  };

  const saveNote = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await api(`/admin/course-requests/${target.id}`, {
        method: "PATCH",
        json: { note: note.trim() || null },
      });
      notifySuccess("تم الحفظ", "تم حفظ الملاحظة");
      setTarget(null);
      void load();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/course-requests/${deleteTarget.id}`, {
        method: "DELETE",
      });
      notifySuccess("تم الحذف", `تم حذف طلب ${deleteTarget.city}`);
      setDeleteTarget(null);
      void load();
    } catch (e) {
      notifyError(e);
    }
  };

  const exportColumns: ExportColumn<CourseRequest>[] = [
    { header: "المدينة", value: (r) => r.city, width: 20 },
    { header: "اسم المستخدم", value: (r) => r.user.username ?? "", width: 26 },
    { header: "الهاتف", value: (r) => r.phone ?? "", width: 16 },
    { header: "الحالة", value: (r) => STATUS_META[r.status].label, width: 14 },
    { header: "مشترك", value: (r) => (r.user.isPremium ? "نعم" : "لا"), width: 10 },
    { header: "الملاحظة", value: (r) => r.note ?? "", width: 30 },
    { header: "تاريخ الطلب", value: (r) => formatCasablanca(r.createdAt), width: 22 },
  ];

  const pending = requests.filter((r) => r.status === "PENDING").length;
  const enrolled = requests.filter((r) => r.status === "ENROLLED").length;
  const topCity = cities[0];

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>طلبات التسجيل في الدروس</Title>
          <Text c="dimmed" size="sm">
            {requests.length} طلباً — المرشحون الذين اختاروا مدينتهم في التطبيق
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            leftSection={<IconFileSpreadsheet size={16} />}
            disabled={requests.length === 0}
            onClick={() => exportExcel("طلبات التسجيل", exportColumns, requests)}
          >
            Excel
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            disabled={requests.length === 0}
            onClick={() => exportPdf("طلبات التسجيل", exportColumns, requests)}
          >
            PDF
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card padding="md">
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">
              طلبات جديدة
            </Text>
            <IconSchool size={18} color="var(--zinc-500)" stroke={1.75} />
          </Group>
          <Text fz={28} fw={700} mt={4}>
            {pending}
          </Text>
        </Card>
        <Card padding="md">
          <Text fz="sm" c="dimmed">
            مسجّلون
          </Text>
          <Text fz={28} fw={700} mt={4}>
            {enrolled}
          </Text>
        </Card>
        <Card padding="md">
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">
              أكثر مدينة طلباً
            </Text>
            <IconMapPin size={18} color="var(--zinc-500)" stroke={1.75} />
          </Group>
          <Text fz={22} fw={700} mt={4}>
            {topCity ? `${topCity.city} (${topCity.count})` : "—"}
          </Text>
        </Card>
      </SimpleGrid>

      {cities.length > 0 && (
        <Card padding="md">
          <Text fz="sm" c="dimmed" mb="xs">
            الطلبات حسب المدينة — اضغط على مدينة لتصفية الجدول
          </Text>
          <Group gap="xs">
            {cities.map((c) => (
              <Badge
                key={c.city}
                variant={city === c.city ? "filled" : "light"}
                color={city === c.city ? "yellow" : "gray"}
                style={{ cursor: "pointer" }}
                onClick={() => setCity(city === c.city ? null : c.city)}
              >
                {c.city} · {c.count}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      <Card padding="lg">
        <Group justify="space-between" mb="md" align="flex-end">
          <Group>
            <TextInput
              placeholder="بحث باسم المستخدم أو الهاتف أو المدينة…"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={280}
            />
            <Select
              placeholder="كل الحالات"
              value={status}
              onChange={(v) => setStatus((v as typeof status) ?? "all")}
              data={[{ value: "all", label: "كل الحالات" }, ...STATUS_OPTIONS]}
              w={160}
            />
          </Group>
          <Group>
            <TextInput
              type="date"
              label="من"
              value={from}
              onChange={(e) => setFrom(e.currentTarget.value)}
            />
            <TextInput
              type="date"
              label="إلى"
              value={to}
              onChange={(e) => setTo(e.currentTarget.value)}
            />
            {(from || to || city) && (
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setCity(null);
                }}
              >
                مسح
              </Button>
            )}
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={860}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>المدينة</Table.Th>
                <Table.Th>المرشح</Table.Th>
                <Table.Th>الهاتف</Table.Th>
                <Table.Th>الحالة</Table.Th>
                <Table.Th>الملاحظة</Table.Th>
                <Table.Th>تاريخ الطلب</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((r) => {
                const wa = waLink(r.phone);
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Group gap={6}>
                        <IconMapPin size={15} stroke={1.75} />
                        <Text size="sm" fw={600}>
                          {r.city}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} style={{ direction: "ltr" }}>
                        {r.user.username ?? r.user.fullName ?? "—"}
                      </Text>
                      {r.user.isPremium && (
                        <Badge size="xs" variant="light" color="green">
                          مشترك
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ direction: "ltr" }}>
                        {r.phone ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        w={130}
                        value={r.status}
                        onChange={(v) =>
                          v && void setStatusOf(r, v as CourseRequestStatus)
                        }
                        data={STATUS_OPTIONS}
                        allowDeselect={false}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ cursor: "pointer", maxWidth: 180 }}
                        lineClamp={2}
                        onClick={() => {
                          setTarget(r);
                          setNote(r.note ?? "");
                        }}
                      >
                        {r.note || "أضف ملاحظة…"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatCasablanca(r.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          component="a"
                          href={wa ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          disabled={!wa}
                          title="مراسلة المرشح على واتساب"
                        >
                          <IconBrandWhatsapp size={17} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => setDeleteTarget(r)}
                          title="حذف الطلب"
                        >
                          <IconTrash size={17} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {requests.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="lg">
                      لا توجد طلبات مطابقة
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal
        opened={target !== null}
        onClose={() => setTarget(null)}
        title={`ملاحظة — ${target?.city ?? ""}`}
        centered
      >
        <Stack>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="مثال: تم الاتصال، سيمر يوم الاثنين"
            autosize
            minRows={3}
            maxLength={500}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTarget(null)}>
              إلغاء
            </Button>
            <Button loading={saving} onClick={() => void saveNote()}>
              حفظ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف الطلب"
        centered
      >
        <Stack>
          <Text size="sm">
            سيُحذف طلب {deleteTarget?.user.username ?? ""} لمدينة{" "}
            {deleteTarget?.city ?? ""}. لا يمكن التراجع.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button color="red" onClick={() => void remove()}>
              حذف
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
