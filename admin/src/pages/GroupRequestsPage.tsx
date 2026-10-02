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
  IconCheck,
  IconFileSpreadsheet,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { GroupRequest, GroupRequestStatus } from "../api/types";
import { formatCasablanca } from "../casablanca";
import { exportExcel, exportPdf, type ExportColumn } from "../export";
import { notifyError, notifySuccess } from "../notify";

const STATUS_META: Record<
  GroupRequestStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "في الانتظار", color: "yellow" },
  APPROVED: { label: "مقبول", color: "green" },
  REJECTED: { label: "مرفوض", color: "gray" },
};

/** Local 0XXXXXXXXX → wa.me's 212XXXXXXXXX. */
function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("212") ? `0${digits.slice(3)}` : digits;
  if (!/^0\d{9}$/.test(local)) return null;
  return `https://wa.me/212${local.slice(1)}`;
}

/** Whole days left on a term, or null when there is none / it has passed. */
function daysLeft(until: string | null): number | null {
  if (!until) return null;
  const days = Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

/**
 * «طلبات التسجيل في المجموعة» — candidates who pressed «الانضمام إلى المجموعة»
 * inside the app.
 *
 * The requests arrive here instead of on WhatsApp because the iOS build has no
 * WhatsApp button (App Store guideline 3.1.1). Android candidates still write
 * on WhatsApp and never appear on this page.
 *
 * قبول GRANTS THREE MONTHS on the spot — it is the same grant as تجديد on
 * المستخدمون — so it goes through a confirmation step, unlike the statuses on
 * طلبات التسجيل which only describe a lead.
 */
export function GroupRequestsPage() {
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | GroupRequestStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [noteTarget, setNoteTarget] = useState<GroupRequest | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [approveTarget, setApproveTarget] = useState<GroupRequest | null>(null);
  const [approving, setApproving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GroupRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await api<{ requests: GroupRequest[] }>(
        `/admin/group-requests?${params.toString()}`,
      );
      setRequests(r.requests);
    } catch (e) {
      notifyError(e);
    }
  }, [search, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const r = await api<{ premiumUntil: string }>(
        `/admin/group-requests/${approveTarget.id}/approve`,
        { method: "POST", json: {} },
      );
      notifySuccess(
        "تم فتح الحساب",
        `${approveTarget.user.username ?? ""} — حتى ${formatCasablanca(r.premiumUntil)}`,
      );
      setApproveTarget(null);
      void load();
    } catch (e) {
      notifyError(e);
    } finally {
      setApproving(false);
    }
  };

  const reject = async (request: GroupRequest) => {
    try {
      await api(`/admin/group-requests/${request.id}`, {
        method: "PATCH",
        json: { status: "REJECTED" },
      });
      notifySuccess("تم الرفض", request.user.username ?? "");
      void load();
    } catch (e) {
      notifyError(e);
    }
  };

  const saveNote = async () => {
    if (!noteTarget) return;
    setSaving(true);
    try {
      await api(`/admin/group-requests/${noteTarget.id}`, {
        method: "PATCH",
        json: { note: note.trim() || null },
      });
      notifySuccess("تم الحفظ", "تم حفظ الملاحظة");
      setNoteTarget(null);
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
      await api(`/admin/group-requests/${deleteTarget.id}`, {
        method: "DELETE",
      });
      notifySuccess("تم الحذف", "تم حذف الطلب");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      notifyError(e);
    }
  };

  const exportColumns: ExportColumn<GroupRequest>[] = [
    { header: "اسم المستخدم", value: (r) => r.user.username ?? "", width: 26 },
    { header: "الهاتف", value: (r) => r.phone ?? "", width: 18 },
    { header: "الحالة", value: (r) => STATUS_META[r.status].label, width: 14 },
    {
      header: "الاشتراك",
      value: (r) => (r.user.isPremium ? "مفتوح" : "مقفل"),
      width: 12,
    },
    { header: "الملاحظة", value: (r) => r.note ?? "", width: 30 },
    {
      header: "تاريخ الطلب",
      value: (r) => formatCasablanca(r.createdAt),
      width: 22,
    },
  ];

  const pending = requests.filter((r) => r.status === "PENDING").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>طلبات التسجيل في المجموعة</Title>
          <Text c="dimmed" size="sm">
            {requests.length} طلباً — المترشحون الذين طلبوا الانضمام من داخل
            التطبيق
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            leftSection={<IconFileSpreadsheet size={16} />}
            disabled={requests.length === 0}
            onClick={() =>
              exportExcel("طلبات المجموعة", exportColumns, requests)
            }
          >
            Excel
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            disabled={requests.length === 0}
            onClick={() => exportPdf("طلبات المجموعة", exportColumns, requests)}
          >
            PDF
          </Button>
        </Group>
      </Group>

      <Card padding="md" withBorder style={{ borderColor: "var(--zinc-300)" }}>
        <Text fz="sm" c="dimmed">
          يصل الطلب إلى هنا عندما يضغط المترشح على «الانضمام إلى المجموعة» داخل
          التطبيق. الضغط على <b>قبول</b> يفتح حسابه مباشرة لمدة 3 أشهر — نفس ما
          يفعله زر «تجديد» في صفحة المستخدمين — ويُسجَّل في سجل العمليات.
          مستعملو أندرويد يراسلونك على واتساب كالعادة ولا تظهر طلباتهم هنا.
        </Text>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card padding="md">
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">
              في الانتظار
            </Text>
            <IconUserPlus size={18} color="var(--zinc-500)" stroke={1.75} />
          </Group>
          <Text fz={28} fw={700} mt={4} c={pending > 0 ? "yellow.7" : undefined}>
            {pending}
          </Text>
        </Card>
        <Card padding="md">
          <Text fz="sm" c="dimmed">
            مقبولون
          </Text>
          <Text fz={28} fw={700} mt={4}>
            {approved}
          </Text>
        </Card>
        <Card padding="md">
          <Text fz="sm" c="dimmed">
            مجموع الطلبات
          </Text>
          <Text fz={28} fw={700} mt={4}>
            {requests.length}
          </Text>
        </Card>
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md" align="flex-end">
          <Group>
            <TextInput
              placeholder="بحث باسم المستخدم أو الهاتف…"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={280}
            />
            <Select
              placeholder="كل الحالات"
              value={status}
              onChange={(v) => setStatus((v as typeof status) ?? "all")}
              data={[
                { value: "all", label: "كل الحالات" },
                ...(
                  Object.keys(STATUS_META) as GroupRequestStatus[]
                ).map((value) => ({ value, label: STATUS_META[value].label })),
              ]}
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
            {(from || to) && (
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                مسح
              </Button>
            )}
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={900}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>المترشح</Table.Th>
                <Table.Th>الهاتف</Table.Th>
                <Table.Th>الحالة</Table.Th>
                <Table.Th>الاشتراك</Table.Th>
                <Table.Th>الملاحظة</Table.Th>
                <Table.Th>تاريخ الطلب</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((r) => {
                const wa = waLink(r.phone);
                const left = daysLeft(r.user.premiumUntil);
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Text size="sm" fw={500} style={{ direction: "ltr" }}>
                        {r.user.username ?? r.user.fullName ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ direction: "ltr" }}>
                        {r.phone ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={STATUS_META[r.status].color}
                      >
                        {STATUS_META[r.status].label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {r.user.isPremium ? (
                        <Text size="xs" c={left !== null && left < 14 ? "orange" : "green"}>
                          مفتوح{left !== null ? ` · ${left} يوم` : ""}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">
                          مقفل
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ cursor: "pointer", maxWidth: 180 }}
                        lineClamp={2}
                        onClick={() => {
                          setNoteTarget(r);
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
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          color="green"
                          leftSection={<IconCheck size={14} />}
                          onClick={() => setApproveTarget(r)}
                        >
                          قبول
                        </Button>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => void reject(r)}
                          disabled={r.status === "REJECTED"}
                          title="رفض الطلب"
                        >
                          <IconX size={17} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          component="a"
                          href={wa ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          disabled={!wa}
                          title="مراسلة المترشح على واتساب"
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
        opened={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        title="قبول الطلب"
        centered
      >
        <Stack>
          <Text size="sm">
            سيُفتح حساب{" "}
            <b style={{ direction: "ltr", display: "inline-block" }}>
              {approveTarget?.user.username ?? ""}
            </b>{" "}
            لمدة 3 أشهر كاملة.
          </Text>
          {approveTarget?.user.isPremium && (
            <Text size="xs" c="dimmed">
              هذا الحساب مفتوح بالفعل — ستُضاف 3 أشهر إلى المدة المتبقية ولن
              تضيع أيّ أيام.
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setApproveTarget(null)}>
              إلغاء
            </Button>
            <Button color="green" loading={approving} onClick={() => void approve()}>
              فتح الحساب
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={noteTarget !== null}
        onClose={() => setNoteTarget(null)}
        title={`ملاحظة — ${noteTarget?.user.username ?? ""}`}
        centered
      >
        <Stack>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="مثال: مسجّل في المدرسة، تم التأكد"
            autosize
            minRows={3}
            maxLength={500}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setNoteTarget(null)}>
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
            سيُحذف طلب {deleteTarget?.user.username ?? ""}. لا يمكن التراجع، ولا
            يؤثر هذا على اشتراكه إن كان مفتوحاً.
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
