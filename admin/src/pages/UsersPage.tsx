import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconFileSpreadsheet,
  IconPrinter,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminUser, UserStatus } from "../api/types";
import { exportExcel, exportPdf, type ExportColumn } from "../export";
import { notifyError, notifySuccess } from "../notify";

const STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  paid: { label: "🟢 مدفوع", color: "green" },
  pending: { label: "🟡 في انتظار الدفع", color: "yellow" },
  free: { label: "⚪ مجاني", color: "gray" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-MA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [target, setTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status, pageSize: "500" });
      if (search.trim()) params.set("search", search.trim());
      const r = await api<{ users: AdminUser[]; total: number }>(
        `/admin/users?${params.toString()}`,
      );
      setUsers(r.users);
      setTotal(r.total);
    } catch (e) {
      notifyError(e);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const togglePremium = async () => {
    if (!target) return;
    try {
      await api(`/admin/users/${target.id}/premium`, {
        method: "POST",
        json: { isPremium: !target.isPremium },
      });
      notifySuccess("تم", target.isPremium ? "أُلغي الاشتراك" : "فُعّل الاشتراك");
      setTarget(null);
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  const counts = {
    paid: users.filter((u) => u.status === "paid").length,
    pending: users.filter((u) => u.status === "pending").length,
    free: users.filter((u) => u.status === "free").length,
  };

  // Exports exactly what the table shows, so a filtered view exports the
  // filtered rows rather than silently dumping everyone.
  const exportColumns: ExportColumn<AdminUser>[] = [
    { header: "اسم المستخدم", value: (u) => u.username ?? "", width: 26 },
    { header: "البريد الإلكتروني", value: (u) => u.email ?? "", width: 30 },
    { header: "الهاتف", value: (u) => u.phone ?? "", width: 16 },
    {
      header: "الحالة",
      value: (u) => STATUS_META[u.status].label.replace(/^\S+\s/, ""),
      width: 18,
    },
    { header: "مشترك", value: (u) => (u.isPremium ? "نعم" : "لا"), width: 10 },
    { header: "طريقة الدفع", value: (u) => u.method ?? "", width: 14 },
    { header: "آخر دفعة", value: (u) => fmtDate(u.lastPaidAt), width: 18 },
    { header: "الأجهزة", value: (u) => u.deviceCount, width: 10 },
    { header: "تاريخ التسجيل", value: (u) => fmtDate(u.createdAt), width: 18 },
  ];

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>المستخدمون</Title>
          <Text c="dimmed" size="sm">
            {total} مستخدماً مسجّلاً
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            leftSection={<IconFileSpreadsheet size={16} />}
            disabled={users.length === 0}
            onClick={() => exportExcel("المستخدمون", exportColumns, users)}
          >
            Excel
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            disabled={users.length === 0}
            onClick={() => exportPdf("المستخدمون", exportColumns, users)}
          >
            PDF
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card padding="md">
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">
              مشتركون مدفوعون
            </Text>
            <IconUsers size={18} color="var(--zinc-500)" stroke={1.75} />
          </Group>
          <Text fz={28} fw={700} mt={4}>
            {counts.paid}
          </Text>
        </Card>
        <Card padding="md">
          <Text fz="sm" c="dimmed">
            في انتظار الدفع
          </Text>
          <Text fz={28} fw={700} mt={4}>
            {counts.pending}
          </Text>
        </Card>
        <Card padding="md">
          <Text fz="sm" c="dimmed">
            مجانيون
          </Text>
          <Text fz={28} fw={700} mt={4}>
            {counts.free}
          </Text>
        </Card>
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="بحث باسم المستخدم أو الهاتف…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={300}
          />
          <SegmentedControl
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            data={[
              { value: "all", label: "الكل" },
              { value: "paid", label: "مدفوع" },
              { value: "pending", label: "معلّق" },
              { value: "free", label: "مجاني" },
            ]}
          />
        </Group>

        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>اسم المستخدم</Table.Th>
                <Table.Th>الهاتف</Table.Th>
                <Table.Th>الحالة</Table.Th>
                <Table.Th>الطريقة</Table.Th>
                <Table.Th>الأجهزة</Table.Th>
                <Table.Th>التسجيل</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Text size="sm" fw={500} style={{ direction: "ltr" }}>
                      {u.username ?? u.fullName ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ direction: "ltr" }}>
                      {u.phone ?? "—"}
                    </Text>
                    {u.email && (
                      <Text size="xs" c="dimmed" style={{ direction: "ltr" }}>
                        {u.email}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_META[u.status].color} variant="light">
                      {STATUS_META[u.status].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{u.method ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>{u.deviceCount}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {fmtDate(u.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {u.role !== "ADMIN" && (
                      <Button
                        size="compact-xs"
                        variant={u.isPremium ? "subtle" : "light"}
                        color={u.isPremium ? "red" : undefined}
                        onClick={() => setTarget(u)}
                      >
                        {u.isPremium ? "إلغاء الاشتراك" : "منح الاشتراك"}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {users.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      لا يوجد مستخدمون مطابقون.
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
        title={target?.isPremium ? "إلغاء الاشتراك" : "منح الاشتراك يدوياً"}
        centered
      >
        <Text size="sm">
          {target?.isPremium
            ? `سيتم إلغاء الاشتراك المميّز عن ${target?.username ?? target?.email}. سيُسجّل هذا الإجراء.`
            : `سيتم منح ${target?.username ?? target?.email} اشتراكاً مميّزاً كاملاً. سيُسجّل هذا الإجراء في سجل التدقيق.`}
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setTarget(null)}>
            إلغاء
          </Button>
          <Button
            color={target?.isPremium ? "red" : undefined}
            onClick={() => void togglePremium()}
          >
            تأكيد
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
