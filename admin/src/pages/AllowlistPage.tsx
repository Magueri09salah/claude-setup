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
  IconInfoCircle,
  IconPhonePlus,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AllowlistEntry } from "../api/types";
import { formatCasablanca } from "../casablanca";
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

  const load = useCallback(async () => {
    try {
      const r = await api<{ entries: AllowlistEntry[] }>("/admin/allowlist");
      setEntries(r.entries);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const claimed = entries?.filter((e) => e.claimedAt).length ?? 0;

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>مجموعة المشتركين المجانيين</Title>
        <Button leftSection={<IconPhonePlus size={16} />} onClick={openModal}>
          إضافة أرقام
        </Button>
      </Group>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={18} />}
        title="كيف تعمل"
      >
        ضع هنا أرقام هواتف أعضاء المجموعة. عندما يسجّل صاحب الرقم في التطبيق
        بنفس الرقم، يُفتح له المحتوى كاملاً تلقائياً دون دفع. إذا كان قد سجّل من
        قبل، يُفتح حسابه فور إضافة رقمه. الأرقام تُقبل بأي صيغة —
        <Text component="span" dir="ltr">
          {" "}
          0612345678 · +212612345678 · 00212612345678
        </Text>
        .
      </Alert>

      {entries && (
        <Group gap="xs">
          <Badge variant="light" leftSection={<IconUsersGroup size={13} />}>
            {entries.length} رقم في المجموعة
          </Badge>
          <Badge variant="light" color="teal">
            {claimed} سجّلوا
          </Badge>
          <Badge variant="light" color="gray">
            {entries.length - claimed} في الانتظار
          </Badge>
        </Group>
      )}

      {!entries ? (
        <Stack gap="xs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={44} radius="md" />
          ))}
        </Stack>
      ) : entries.length === 0 ? (
        <Card padding="xl">
          <Stack align="center" gap="xs">
            <IconUsersGroup size={32} color="var(--zinc-400)" />
            <Text c="dimmed">لا توجد أرقام بعد — اضغط «إضافة أرقام».</Text>
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
              {entries.map((e) => (
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
