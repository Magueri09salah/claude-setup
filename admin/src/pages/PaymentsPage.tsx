import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconCash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminPayment, PayStatus } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

const STATUS_COLOR: Record<PayStatus, string> = {
  PENDING: "yellow",
  PAID: "green",
  FAILED: "red",
  EXPIRED: "gray",
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-MA", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [confirmTarget, setConfirmTarget] = useState<AdminPayment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ payments: AdminPayment[] }>(
        `/admin/payments?status=${status}&method=${method}`,
      );
      setPayments(r.payments);
    } catch (e) {
      notifyError(e);
    }
  }, [status, method]);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async () => {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      await api(`/admin/payments/${confirmTarget.id}/mark-paid`, {
        method: "POST",
      });
      notifySuccess("تم التأكيد", "فُعّل اشتراك المستخدم");
      setConfirmTarget(null);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const pendingWafacash = payments.filter(
    (p) => p.status === "PENDING" && p.method === "WAFACASH",
  );

  return (
    <Stack>
      <div>
        <Title order={3}>المدفوعات</Title>
        <Text c="dimmed" size="sm">
          المعاملات وتأكيد أكواد Wafacash
        </Text>
      </div>

      {pendingWafacash.length > 0 && (
        <Card padding="lg" style={{ borderColor: "var(--mantine-color-yellow-4)" }}>
          <Group gap="xs" mb="sm">
            <IconCash size={18} />
            <Text fw={600}>
              أكواد Wafacash بانتظار التأكيد ({pendingWafacash.length})
            </Text>
          </Group>
          <Stack gap="xs">
            {pendingWafacash.map((p) => (
              <Group key={p.id} justify="space-between">
                <Group gap="md">
                  <Badge variant="light" size="lg" style={{ direction: "ltr" }}>
                    {p.wafacashCode}
                  </Badge>
                  <div>
                    <Text size="sm">{p.userName ?? "—"}</Text>
                    <Text size="xs" c="dimmed" style={{ direction: "ltr" }}>
                      {p.userEmail}
                    </Text>
                  </div>
                  <Text size="sm" c="dimmed">
                    {p.amount} {p.currency}
                  </Text>
                </Group>
                <Button size="compact-sm" onClick={() => setConfirmTarget(p)}>
                  تأكيد الدفع يدوياً
                </Button>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      <Card padding="lg">
        <Group mb="md" gap="lg">
          <SegmentedControl
            value={status}
            onChange={setStatus}
            data={[
              { value: "all", label: "كل الحالات" },
              { value: "PENDING", label: "معلّق" },
              { value: "PAID", label: "مدفوع" },
              { value: "FAILED", label: "فشل" },
              { value: "EXPIRED", label: "منتهٍ" },
            ]}
          />
          <SegmentedControl
            value={method}
            onChange={setMethod}
            data={[
              { value: "all", label: "الكل" },
              { value: "ONLINE", label: "بطاقة" },
              { value: "WAFACASH", label: "Wafacash" },
            ]}
          />
        </Group>

        <Table.ScrollContainer minWidth={820}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>المستخدم</Table.Th>
                <Table.Th>الطريقة</Table.Th>
                <Table.Th>المبلغ</Table.Th>
                <Table.Th>الرمز</Table.Th>
                <Table.Th>الحالة</Table.Th>
                <Table.Th>التاريخ</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {payments.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Text size="sm">{p.userName ?? "—"}</Text>
                    <Text size="xs" c="dimmed" style={{ direction: "ltr" }}>
                      {p.userEmail}
                    </Text>
                  </Table.Td>
                  <Table.Td>{p.method === "ONLINE" ? "بطاقة" : "Wafacash"}</Table.Td>
                  <Table.Td>
                    {p.amount} {p.currency}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" style={{ direction: "ltr" }}>
                      {p.wafacashCode ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[p.status]} variant="light">
                      {p.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {fmtDateTime(p.paidAt ?? p.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {p.status === "PENDING" && (
                      <Button
                        size="compact-xs"
                        variant="light"
                        onClick={() => setConfirmTarget(p)}
                      >
                        تأكيد
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {payments.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      لا توجد مدفوعات مطابقة.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal
        opened={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title="تأكيد الدفع يدوياً"
        centered
      >
        <Text size="sm">
          سيتم وضع علامة «مدفوع» على هذه المعاملة وتفعيل اشتراك{" "}
          <b style={{ direction: "ltr", display: "inline-block" }}>
            {confirmTarget?.userName ?? confirmTarget?.userEmail}
          </b>{" "}
          فوراً. يُسجَّل هذا الإجراء باسمك في سجل التدقيق.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirmTarget(null)}>
            إلغاء
          </Button>
          <Button loading={busy} onClick={() => void markPaid()}>
            تأكيد الدفع
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
