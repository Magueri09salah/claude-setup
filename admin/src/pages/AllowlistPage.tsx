import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Skeleton,
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
  IconInfoCircle,
  IconPhonePlus,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AllowlistEntry } from "../api/types";
import { formatCasablanca } from "../casablanca";
import { exportExcel, exportPdf, type ExportColumn } from "../export";
import { notifyError, notifySuccess } from "../notify";

interface AddResult {
  added: string[];
  invalid: string[];
  duplicate: string[];
  grantedNow: string[];
}

export function AllowlistPage() {
  const [entries, setEntries] = useState<AllowlistEntry[] | null>(null);
  const [modal, setModal] = useState(false);
  const [phones, setPhones] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AllowlistEntry | null>(null);
  // Date range on "added on", as yyyy-mm-dd from native date inputs.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  // WhatsApp contact shown in the app instead of a payment screen — it lives
  // here because this page is the other half of the same loop: they message,
  // you add their number below.
  const [whatsapp, setWhatsapp] = useState("");
  const [savedWhatsapp, setSavedWhatsapp] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ entries: AllowlistEntry[] }>("/admin/allowlist");
      setEntries(r.entries);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const r = await api<{ settings: { whatsappNumber: string | null } }>(
        "/admin/app-settings",
      );
      setWhatsapp(r.settings.whatsappNumber ?? "");
      setSavedWhatsapp(r.settings.whatsappNumber ?? "");
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadSettings();
  }, [load, loadSettings]);

  const saveWhatsapp = async () => {
    setSavingWhatsapp(true);
    try {
      const r = await api<{ settings: { whatsappNumber: string | null } }>(
        "/admin/app-settings",
        { method: "PUT", json: { whatsappNumber: whatsapp.trim() } },
      );
      setWhatsapp(r.settings.whatsappNumber ?? "");
      setSavedWhatsapp(r.settings.whatsappNumber ?? "");
      notifySuccess("تم الحفظ", "تم تحديث رقم واتساب");
    } catch (e) {
      notifyError(e);
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const openModal = () => {
    setPhones("");
    setNote("");
    setResult(null);
    setModal(true);
  };

  const add = async () => {
    if (!phones.trim()) return;
    setSaving(true);
    try {
      const r = await api<AddResult>("/admin/allowlist", {
        method: "POST",
        json: { phones, note: note.trim() || undefined },
      });
      setResult(r);
      setPhones("");
      notifySuccess(
        "تمت الإضافة",
        `أُضيف ${r.added.length} رقم${
          r.grantedNow.length ? ` · فُتح الحساب فوراً لـ ${r.grantedNow.length}` : ""
        }`,
      );
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/allowlist/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      notifySuccess("تم الحذف", "حُذف الرقم من المجموعة");
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  // Filtering happens here so the table, the counters and BOTH exports all
  // read the same array — an export that ignored the filters would quietly
  // hand out the whole list.
  const query = search.trim();
  const visible = (entries ?? []).filter((e) => {
    const day = e.createdAt.slice(0, 10); // ISO date, comparable as a string
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (query && !e.phone.includes(query) && !(e.note ?? "").includes(query)) {
      return false;
    }
    return true;
  });
  const claimed = visible.filter((e) => e.claimedAt).length;
  const filtersOn = !!(from || to || query);

  const exportColumns: ExportColumn<AllowlistEntry>[] = [
    { header: "الرقم", value: (e) => e.phone, width: 16 },
    { header: "المجموعة", value: (e) => e.note ?? "", width: 28 },
    {
      header: "الحساب",
      value: (e) => e.claimedUser?.fullName ?? e.claimedUser?.email ?? "لم يسجّل بعد",
      width: 30,
    },
    {
      header: "تاريخ التسجيل",
      value: (e) => (e.claimedAt ? formatCasablanca(e.claimedAt) : ""),
      width: 22,
    },
    { header: "أُضيف في", value: (e) => formatCasablanca(e.createdAt), width: 22 },
  ];

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>مجموعة المشتركين المجانيين</Title>
        <Group>
          <Button
            variant="default"
            leftSection={<IconFileSpreadsheet size={16} />}
            disabled={visible.length === 0}
            onClick={() =>
              exportExcel("المجموعة-المجانية", exportColumns, visible)
            }
          >
            Excel
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            disabled={visible.length === 0}
            onClick={() =>
              exportPdf("مجموعة المشتركين المجانيين", exportColumns, visible)
            }
          >
            PDF
          </Button>
          <Button leftSection={<IconPhonePlus size={16} />} onClick={openModal}>
            إضافة أرقام
          </Button>
        </Group>
      </Group>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={18} />}
        title="كيف تعمل"
      >
        لا يوجد دفع داخل التطبيق: المترشح يضغط زر واتساب، يراسلك، ثم تضيف رقمه
        هنا فيُفتح له المحتوى كاملاً. إذا كان قد سجّل من قبل يُفتح حسابه فور
        إضافة رقمه، وإلا فعند تسجيله بنفس الرقم. الأرقام تُقبل بأي صيغة —
        <Text component="span" dir="ltr">
          {" "}
          0612345678 · +212612345678 · 00212612345678
        </Text>
        .
      </Alert>

      <Card padding="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <TextInput
              label="رقم واتساب للتواصل"
              description="الرقم الذي يظهر للمترشحين في التطبيق عند طلب فتح المحتوى"
              placeholder="0612345678"
              dir="ltr"
              styles={{ input: { textAlign: "left" } }}
              leftSection={<IconBrandWhatsapp size={16} color="#25D366" />}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.currentTarget.value)}
            />
          </div>
          <Button
            loading={savingWhatsapp}
            disabled={whatsapp.trim() === savedWhatsapp}
            onClick={() => void saveWhatsapp()}
          >
            حفظ الرقم
          </Button>
        </Group>
        {!savedWhatsapp && (
          <Text size="xs" c="orange" mt="xs">
            لم يُضبط رقم بعد — زر واتساب لا يظهر للمترشحين حتى تضيفه.
          </Text>
        )}
      </Card>

      <Card padding="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <TextInput
            label="بحث"
            placeholder="رقم أو اسم مجموعة"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={220}
          />
          <TextInput
            type="date"
            label="أُضيف من"
            value={from}
            onChange={(e) => setFrom(e.currentTarget.value)}
            w={170}
          />
          <TextInput
            type="date"
            label="إلى"
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
            w={170}
          />
          {filtersOn && (
            <Button
              variant="subtle"
              onClick={() => {
                setSearch("");
                setFrom("");
                setTo("");
              }}
            >
              مسح الفلاتر
            </Button>
          )}
        </Group>
      </Card>

      {entries && (
        <Group gap="xs">
          <Badge variant="light" leftSection={<IconUsersGroup size={13} />}>
            {visible.length} رقم{filtersOn ? ` من ${entries.length}` : " في المجموعة"}
          </Badge>
          <Badge variant="light" color="teal">
            {claimed} سجّلوا
          </Badge>
          <Badge variant="light" color="gray">
            {visible.length - claimed} في الانتظار
          </Badge>
        </Group>
      )}

      {!entries ? (
        <Stack gap="xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={44} radius="md" />
          ))}
        </Stack>
      ) : visible.length === 0 ? (
        <Card padding="xl">
          <Stack align="center" gap="xs">
            <IconUsersGroup size={32} color="var(--zinc-400)" />
            <Text c="dimmed">
              {filtersOn
                ? "لا توجد أرقام تطابق الفلاتر الحالية."
                : "لا توجد أرقام بعد — اضغط «إضافة أرقام»."}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Card padding="lg">
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={150}>الرقم</Table.Th>
                <Table.Th>المجموعة</Table.Th>
                <Table.Th w={220}>الحساب</Table.Th>
                <Table.Th w={160}>أُضيف في</Table.Th>
                <Table.Th w={60} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visible.map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td>
                    <Text size="sm" dir="ltr" ta="left">
                      {e.phone}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={e.note ? undefined : "dimmed"}>
                      {e.note ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {e.claimedUser ? (
                      <Badge variant="light" color="teal">
                        {e.claimedUser.fullName ?? e.claimedUser.email}
                      </Badge>
                    ) : (
                      <Badge variant="light" color="gray">
                        لم يسجّل بعد
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {formatCasablanca(e.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="حذف"
                      onClick={() => setDeleteTarget(e)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal
        opened={modal}
        onClose={() => setModal(false)}
        title="إضافة أرقام إلى المجموعة"
        centered
        size="lg"
      >
        <Stack>
          <Textarea
            label="أرقام الهواتف"
            description="رقم في كل سطر — يمكنك لصق القائمة كاملة دفعة واحدة"
            placeholder={"0612345678\n0700112233\n+212661234567"}
            dir="ltr"
            styles={{ input: { textAlign: "left", fontFamily: "monospace" } }}
            autosize
            minRows={6}
            maxRows={14}
            data-autofocus
            value={phones}
            onChange={(e) => setPhones(e.currentTarget.value)}
          />
          <TextInput
            label="اسم المجموعة (اختياري)"
            placeholder="مثل: مدرسة السلام — فوج مارس"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />

          {result && (
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                نتيجة الإضافة
              </Text>
              <Group gap="xs">
                <Badge color="teal" variant="light">
                  أُضيف {result.added.length}
                </Badge>
                {result.grantedNow.length > 0 && (
                  <Badge color="blue" variant="light">
                    فُتح فوراً {result.grantedNow.length}
                  </Badge>
                )}
                {result.duplicate.length > 0 && (
                  <Badge color="gray" variant="light">
                    مكرر {result.duplicate.length}
                  </Badge>
                )}
                {result.invalid.length > 0 && (
                  <Badge color="red" variant="light">
                    غير صالح {result.invalid.length}
                  </Badge>
                )}
              </Group>
              {result.invalid.length > 0 && (
                <Alert variant="light" color="red">
                  <Text size="xs" dir="ltr" ta="left">
                    {result.invalid.join(" · ")}
                  </Text>
                </Alert>
              )}
            </Stack>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModal(false)}>
              إغلاق
            </Button>
            <Button
              loading={saving}
              disabled={!phones.trim()}
              onClick={() => void add()}
            >
              إضافة
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف الرقم"
        centered
      >
        <Text size="sm">
          سيُحذف الرقم <b dir="ltr">{deleteTarget?.phone}</b> من المجموعة، فلن
          يُفتح الحساب لمن يسجّل به لاحقاً. أمّا من فُتح حسابه من قبل فيبقى
          مفتوحاً — لسحبه استعمل صفحة المستخدمين.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
          <Button color="red" onClick={() => void remove()}>
            حذف
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
