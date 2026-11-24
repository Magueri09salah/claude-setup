import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Pagination,
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
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminUser, UserStatus } from "../api/types";
import { useAuth } from "../auth";
import { exportExcel, exportPdf, type ExportColumn } from "../export";
import { notifyError, notifySuccess } from "../notify";

const STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  paid: { label: "🟢 مشترك", color: "green" },
  expired: { label: "🔴 منتهي", color: "red" },
  pending: { label: "🟡 في انتظار الدفع", color: "yellow" },
  free: { label: "⚪ مجاني", color: "gray" },
};

/** Whole days until an expiry date; negative once it has passed. */
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/** "ينتهي بعد 12 يوماً" / "انتهى منذ 3 أيام" / "مدى الحياة". */
function expiryLabel(u: AdminUser): { text: string; color: string } {
  if (!u.isPremium) return { text: "—", color: "dimmed" };
  if (u.premiumUntil === null) return { text: "مدى الحياة", color: "dimmed" };
  const d = daysLeft(u.premiumUntil);
  if (d === null) return { text: "—", color: "dimmed" };
  if (d < 0) return { text: `انتهى منذ ${Math.abs(d)} يوم`, color: "red" };
  if (d === 0) return { text: "ينتهي اليوم", color: "red" };
  // Two weeks out is when the owner wants to notice, not the day it dies.
  return { text: `${d} يوم متبقٍ`, color: d <= 14 ? "orange" : "dimmed" };
}

/**
 * Rows per page (owner request 2026-11-24). The page used to ask for ONE
 * page of 500 and nothing after it, so past 500 accounts the rest were simply
 * unreachable from the panel.
 */
const PAGE_SIZE = 100;
/** The API's own pageSize cap — the exports read every page at this size. */
const EXPORT_PAGE_SIZE = 500;

interface UsersResponse {
  users: AdminUser[];
  total: number;
  /** Every account matching the search, whatever the page and status tab. */
  counts: Record<UserStatus, number>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-MA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function UsersPage() {
  // The API already withholds resetDigits from an assistant; this only stops
  // the column rendering as a wall of "غير متوفر" for them. The server is what
  // makes it secure — hiding a column in the SPA is not.
  const isAdmin = useAuth().user?.role === "ADMIN";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<UserStatus, number>>({
    paid: 0,
    expired: 0,
    pending: 0,
    free: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [target, setTarget] = useState<AdminUser | null>(null);
  // Ids, not rows: the list is reloaded after every action and object identity
  // would not survive it.
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const usersUrl = useCallback(
    (p: number, size: number) => {
      const params = new URLSearchParams({
        status,
        page: String(p),
        pageSize: String(size),
      });
      if (search.trim()) params.set("search", search.trim());
      return `/admin/users?${params.toString()}`;
    },
    [search, status],
  );

  const load = useCallback(async () => {
    try {
      const r = await api<UsersResponse>(usersUrl(page, PAGE_SIZE));
      // Past the end — the last rows of the last page were just deleted, or a
      // renewal moved them out of the status tab. Step back to the new last
      // page; changing `page` reloads by itself.
      if (r.users.length === 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(r.total / PAGE_SIZE)));
        return;
      }
      setUsers(r.users);
      setTotal(r.total);
      setCounts(r.counts);
      // A filter, search or PAGE change can hide a ticked row. Dropping it
      // here is what stops the trash button from deleting people the owner
      // can no longer see.
      setSelected((prev) => prev.filter((id) => r.users.some((u) => u.id === id)));
    } catch (e) {
      notifyError(e);
    }
  }, [usersUrl, page]);

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

  const renew = async (u: AdminUser) => {
    try {
      const r = await api<{ premiumUntil: string }>(`/admin/users/${u.id}/renew`, {
        method: "POST",
      });
      notifySuccess(
        "تم التجديد",
        `${u.username ?? u.phone ?? ""} — حتى ${fmtDate(r.premiumUntil)}`,
      );
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  // Staff accounts are not deletable (the API refuses them too), so they are
  // not selectable either — a checkbox that always fails is worse than none.
  const deletable = users.filter((u) => u.role === "USER");
  const allChecked =
    deletable.length > 0 && selected.length === deletable.length;
  const someChecked = selected.length > 0 && !allChecked;

  const toggleOne = (id: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));

  const toggleAll = (on: boolean) =>
    setSelected(on ? deletable.map((u) => u.id) : []);

  const removeSelected = async () => {
    setDeleting(true);
    try {
      const r = await api<{ deleted: number }>("/admin/users/delete", {
        method: "POST",
        json: { ids: selected },
      });
      notifySuccess("تم الحذف", `حذف ${r.deleted} حساباً نهائياً`);
      setSelected([]);
      setConfirmDelete(false);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setDeleting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  const goToPage = (p: number) => {
    setPage(p);
    // The pager sits under 100 rows; the next page should start at its top.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Exports follow the current status tab and search, but across EVERY page —
  // the table shows 100 rows at a time, an export of "page 3" is never what is
  // wanted. Read at the API's maximum page size; deduped by id because a
  // registration landing mid-export shifts every later row down by one.
  const runExport = async (to: (rows: AdminUser[]) => void) => {
    setExporting(true);
    try {
      const byId = new Map<string, AdminUser>();
      for (let p = 1; ; p++) {
        const r = await api<UsersResponse>(usersUrl(p, EXPORT_PAGE_SIZE));
        for (const u of r.users) byId.set(u.id, u);
        if (r.users.length < EXPORT_PAGE_SIZE || p * EXPORT_PAGE_SIZE >= r.total) break;
      }
      to([...byId.values()]);
    } catch (e) {
      notifyError(e);
    } finally {
      setExporting(false);
    }
  };

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
    { header: "ينتهي في", value: (u) => fmtDate(u.premiumUntil), width: 16 },
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
            disabled={total === 0}
            loading={exporting}
            onClick={() =>
              void runExport((rows) => exportExcel("المستخدمون", exportColumns, rows))
            }
          >
            Excel
          </Button>
          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            disabled={total === 0}
            loading={exporting}
            onClick={() =>
              void runExport((rows) => exportPdf("المستخدمون", exportColumns, rows))
            }
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
            اشتراكات منتهية
          </Text>
          <Text fz={28} fw={700} mt={4} c={counts.expired > 0 ? "red" : undefined}>
            {counts.expired}
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
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            w={300}
          />
          <Group>
            {/* Owner only — the API refuses this route for an assistant, and a
                button that always 403s is not a button. */}
            {isAdmin && (
              <Button
                color="red"
                variant={selected.length > 0 ? "filled" : "default"}
                leftSection={<IconTrash size={16} />}
                disabled={selected.length === 0}
                onClick={() => setConfirmDelete(true)}
              >
                {selected.length > 0 ? `حذف (${selected.length})` : "حذف"}
              </Button>
            )}
            <SegmentedControl
              value={status}
              onChange={(v) => {
                setStatus(v as typeof status);
                setPage(1);
              }}
              data={[
                { value: "all", label: "الكل" },
                { value: "paid", label: "مشترك" },
                { value: "expired", label: "منتهي" },
                { value: "free", label: "مجاني" },
              ]}
            />
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {isAdmin && (
                  <Table.Th w={40}>
                    <Checkbox
                      aria-label="تحديد الكل"
                      checked={allChecked}
                      indeterminate={someChecked}
                      disabled={deletable.length === 0}
                      onChange={(e) => toggleAll(e.currentTarget.checked)}
                    />
                  </Table.Th>
                )}
                <Table.Th>اسم المستخدم</Table.Th>
                <Table.Th>الهاتف</Table.Th>
                {isAdmin && <Table.Th>رمز الاستعادة</Table.Th>}
                <Table.Th>الحالة</Table.Th>
                <Table.Th>الاشتراك</Table.Th>
                <Table.Th>الأجهزة</Table.Th>
                <Table.Th>التسجيل</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => (
                <Table.Tr key={u.id} bg={selected.includes(u.id) ? "var(--mantine-color-red-light)" : undefined}>
                  {isAdmin && (
                    <Table.Td>
                      {u.role === "USER" && (
                        <Checkbox
                          aria-label={`تحديد ${u.username ?? u.phone ?? ""}`}
                          checked={selected.includes(u.id)}
                          onChange={(e) => toggleOne(u.id, e.currentTarget.checked)}
                        />
                      )}
                    </Table.Td>
                  )}
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
                  {isAdmin && (
                    <Table.Td>
                      {u.resetDigits ? (
                        <Text size="sm" fw={600} style={{ direction: "ltr" }}>
                          {u.resetDigits}
                        </Text>
                      ) : (
                        // Registered before the digits were kept readable. The
                        // stored hash cannot be reversed, so this account can
                        // only be helped by having them register again.
                        <Text size="xs" c="dimmed">
                          غير متوفر
                        </Text>
                      )}
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Badge color={STATUS_META[u.status].color} variant="light">
                      {STATUS_META[u.status].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={expiryLabel(u).color}>
                      {expiryLabel(u).text}
                    </Text>
                    {u.isPremium && u.premiumUntil && (
                      <Text size="xs" c="dimmed">
                        {fmtDate(u.premiumUntil)}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{u.deviceCount}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {fmtDate(u.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {u.role !== "ADMIN" && (
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        {/* The after-expiry path: find them by phone or name,
                            press this, they get another three months. */}
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="green"
                          onClick={() => void renew(u)}
                        >
                          {u.status === "expired" ? "تجديد 3 أشهر" : "+3 أشهر"}
                        </Button>
                        <Button
                          size="compact-xs"
                          variant={u.isPremium ? "subtle" : "light"}
                          color={u.isPremium ? "red" : undefined}
                          onClick={() => setTarget(u)}
                        >
                          {u.isPremium ? "إلغاء" : "منح"}
                        </Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {users.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 9 : 7}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      لا يوجد مستخدمون مطابقون.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {total > 0 && (
          <Group justify="space-between" mt="md">
            {/* Words, not "1–100": in this RTL page a dash between two numbers
                is laid out right-to-left and would read "100–1". */}
            <Text size="sm" c="dimmed">
              عرض {firstRow} إلى {lastRow} من أصل {total}
            </Text>
            {pageCount > 1 && (
              <Pagination
                total={pageCount}
                value={page}
                onChange={goToPage}
                siblings={1}
                boundaries={1}
              />
            )}
          </Group>
        )}
      </Card>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="حذف الحسابات المحددة"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            سيتم حذف {selected.length} حساباً نهائياً مع كل نتائجهم وأجهزتهم
            وطلباتهم. لا يمكن التراجع عن هذا الإجراء.
          </Text>
          <Text size="xs" c="dimmed">
            {users
              .filter((u) => selected.includes(u.id))
              .slice(0, 8)
              .map((u) => u.username ?? u.phone ?? u.id)
              .join("، ")}
            {selected.length > 8 ? " …" : ""}
          </Text>
          <Text size="xs" c="dimmed">
            أرقام المجموعة المجانية لا تُحذف — يُلغى ربطها فقط، فيمكن لنفس
            الشخص التسجيل من جديد.
          </Text>
        </Stack>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirmDelete(false)}>
            إلغاء
          </Button>
          <Button color="red" loading={deleting} onClick={() => void removeSelected()}>
            حذف نهائي
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={target !== null}
        onClose={() => setTarget(null)}
        title={target?.isPremium ? "إلغاء الاشتراك" : "منح الاشتراك يدوياً"}
        centered
      >
        <Text size="sm">
          {target?.isPremium
            ? `سيتم إلغاء الاشتراك المميّز عن ${target?.username ?? target?.email}. سيُسجّل هذا الإجراء.`
            : `سيتم منح ${target?.username ?? target?.email} اشتراكاً كاملاً لمدة 3 أشهر. سيُسجّل هذا الإجراء في سجل التدقيق.`}
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
