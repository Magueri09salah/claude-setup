import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconKey,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { formatCasablanca } from "../casablanca";
import { notifyError, notifySuccess } from "../notify";

interface StaffAccount {
  id: string;
  email: string | null;
  username: string | null;
  createdAt: string;
}

/**
 * Sign-in details for whoever is logged in, plus the owner's assistant
 * accounts. The assistant sees only the first card — the API enforces that
 * independently, this just avoids showing them a panel they cannot use.
 */
export function AccountPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ── my own credentials ──
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // ── assistants ──
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffAccount | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffAccount | null>(null);

  const loadStaff = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const r = await api<{ staff: StaffAccount[] }>("/admin/account/staff");
      setStaff(r.staff);
    } catch (e) {
      notifyError(e);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const passwordMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;

  const saveMine = async () => {
    if (!currentPassword) {
      notifyError(new Error("أدخل كلمة المرور الحالية"));
      return;
    }
    if (passwordMismatch) {
      notifyError(new Error("كلمتا المرور غير متطابقتين"));
      return;
    }
    const emailChanged = email.trim() !== (user?.email ?? "");
    if (!emailChanged && !newPassword) {
      notifyError(new Error("لا يوجد تغيير"));
      return;
    }

    setSaving(true);
    try {
      const r = await api<{ signedOutOtherDevices: boolean }>("/admin/account/me", {
        method: "PATCH",
        json: {
          currentPassword,
          ...(emailChanged ? { email: email.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
        },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (r.signedOutOtherDevices) {
        notifySuccess(
          "تم التحديث",
          "تم تغيير كلمة المرور. سيُطلب منك تسجيل الدخول من جديد.",
        );
        // The password changed, so every other session was revoked. Signing out
        // here too avoids the confusing half-state of a panel that still works
        // on this tab but nowhere else.
        setTimeout(logout, 1500);
      } else {
        notifySuccess("تم التحديث", "تم تحديث بيانات الدخول");
      }
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const createStaff = async () => {
    setCreating(true);
    try {
      await api("/admin/account/staff", {
        method: "POST",
        json: { email: newEmail.trim(), password: newStaffPassword },
      });
      notifySuccess("تم الإنشاء", `حساب مساعد: ${newEmail.trim()}`);
      setCreateOpen(false);
      setNewEmail("");
      setNewStaffPassword("");
      void loadStaff();
    } catch (e) {
      notifyError(e);
    } finally {
      setCreating(false);
    }
  };

  const doReset = async () => {
    if (!resetTarget) return;
    try {
      await api(`/admin/account/staff/${resetTarget.id}/password`, {
        method: "PATCH",
        json: { password: resetPassword },
      });
      notifySuccess("تم التغيير", `كلمة مرور جديدة لـ ${resetTarget.email}`);
      setResetTarget(null);
      setResetPassword("");
    } catch (e) {
      notifyError(e);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/account/staff/${deleteTarget.id}`, { method: "DELETE" });
      notifySuccess("تم الحذف", `${deleteTarget.email}`);
      setDeleteTarget(null);
      void loadStaff();
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <Stack>
      <div>
        <Title order={3}>الحساب</Title>
        <Text c="dimmed" size="sm">
          بيانات دخولك إلى لوحة التحكم{isAdmin ? " وحسابات المساعدين" : ""}
        </Text>
      </div>

      {/* ── my sign-in details ── */}
      <Card padding="lg">
        <Title order={5} mb="xs">
          بيانات الدخول
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          غيّر بريدك أو كلمة مرورك. كلمة المرور الحالية مطلوبة في الحالتين.
        </Text>

        <Stack gap="sm" maw={460}>
          <TextInput
            label="البريد الإلكتروني"
            description="هو ما تسجّل به الدخول"
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="كلمة المرور الحالية"
            description="مطلوبة لتأكيد أنك أنت"
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="كلمة مرور جديدة"
            description="اتركها فارغة إذا كنت تغيّر البريد فقط — 8 أحرف على الأقل"
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          {newPassword.length > 0 && (
            <PasswordInput
              label="تأكيد كلمة المرور الجديدة"
              dir="ltr"
              styles={{ input: { textAlign: "left" } }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={passwordMismatch ? "غير متطابقتين" : undefined}
            />
          )}

          {newPassword.length > 0 && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="orange"
              variant="light"
            >
              تغيير كلمة المرور يُنهي الجلسات المفتوحة على الأجهزة الأخرى، وسيُطلب
              منك تسجيل الدخول من جديد.
            </Alert>
          )}

          <Group>
            <Button loading={saving} onClick={() => void saveMine()}>
              حفظ التغييرات
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* ── assistants, owner only ── */}
      {isAdmin && (
        <Card padding="lg">
          <Group justify="space-between" mb="xs">
            <div>
              <Title order={5}>حسابات المساعدين</Title>
              <Text size="sm" c="dimmed">
                يرى المساعد صفحتي المستخدمون والمجموعة المجانية فقط، ولا يمكنه
                تعديل المحتوى أو النشر.
              </Text>
            </div>
            <Button
              leftSection={<IconUserPlus size={16} />}
              onClick={() => setCreateOpen(true)}
            >
              إضافة مساعد
            </Button>
          </Group>

          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>البريد الإلكتروني</Table.Th>
                <Table.Th>اسم المستخدم</Table.Th>
                <Table.Th>أُنشئ في</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {staff.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>
                    <Text size="sm" style={{ direction: "ltr" }}>
                      {s.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" style={{ direction: "ltr" }}>
                      {s.username}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {formatCasablanca(s.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <ActionIcon
                        variant="subtle"
                        title="تغيير كلمة المرور"
                        onClick={() => {
                          setResetTarget(s);
                          setResetPassword("");
                        }}
                      >
                        <IconKey size={17} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        title="حذف الحساب"
                        onClick={() => setDeleteTarget(s)}
                      >
                        <IconTrash size={17} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {staff.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed" py="lg">
                      لا يوجد مساعدون بعد
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إضافة حساب مساعد"
        centered
      >
        <Stack>
          <TextInput
            label="البريد الإلكتروني"
            placeholder="assistant@codeboujida.com"
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="كلمة المرور"
            description="8 أحرف على الأقل — أعطها للمساعد مباشرة"
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={newStaffPassword}
            onChange={(e) => setNewStaffPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button
              loading={creating}
              disabled={!newEmail.trim() || newStaffPassword.length < 8}
              onClick={() => void createStaff()}
            >
              إنشاء
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title={`كلمة مرور جديدة — ${resetTarget?.email ?? ""}`}
        centered
      >
        <Stack>
          <PasswordInput
            label="كلمة المرور الجديدة"
            description="8 أحرف على الأقل. ستُغلق جلسات المساعد المفتوحة."
            dir="ltr"
            styles={{ input: { textAlign: "left" } }}
            value={resetPassword}
            onChange={(e) => setResetPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResetTarget(null)}>
              إلغاء
            </Button>
            <Button
              disabled={resetPassword.length < 8}
              onClick={() => void doReset()}
            >
              تغيير
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف حساب المساعد"
        centered
      >
        <Stack>
          <Text size="sm">
            سيُحذف حساب {deleteTarget?.email} نهائياً ولن يتمكن من الدخول. لا يمكن
            التراجع.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button color="red" onClick={() => void doDelete()}>
              حذف
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
