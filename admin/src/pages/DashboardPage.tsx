import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBell,
  IconBroadcast,
  IconCash,
  IconChecklist,
  IconStar,
  IconUsers,
  type IconProps,
} from "@tabler/icons-react";
import { useEffect, useState, type ComponentType } from "react";
import { api } from "../api/client";
import type { DashboardStats } from "../api/types";
import { formatCasablanca } from "../casablanca";
import { notifyError } from "../notify";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<IconProps>;
}) {
  return (
    <Card padding="md">
      <Group justify="space-between" align="flex-start">
        <Text fz="sm" c="dimmed">
          {label}
        </Text>
        <Icon size={18} color="var(--zinc-500)" stroke={1.75} />
      </Group>
      <Text fz={28} fw={700} lh={1.2} mt={4}>
        {value}
      </Text>
      {hint && (
        <Text fz="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api<DashboardStats>("/admin/dashboard").then(setStats).catch(notifyError);
  }, []);

  return (
    <Stack>
      <div>
        <Title order={3}>لوحة المعلومات</Title>
        <Text c="dimmed" size="sm">
          نظرة عامة على المستخدمين والاشتراكات والنشاط
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <Stat
          label="المستخدمون"
          value={stats?.users ?? "—"}
          icon={IconUsers}
        />
        <Stat
          label="المشتركون"
          value={stats?.premiumUsers ?? "—"}
          hint={
            stats && stats.users > 0
              ? `${Math.round((stats.premiumUsers / stats.users) * 100)}% من المستخدمين`
              : undefined
          }
          icon={IconStar}
        />
        <Stat
          label="الإيرادات"
          value={stats ? `${stats.revenue} MAD` : "—"}
          hint={stats ? `${stats.paidCount} عملية دفع` : undefined}
          icon={IconCash}
        />
        <Stat
          label="المحاولات"
          value={stats?.attempts ?? "—"}
          icon={IconChecklist}
        />
        <Stat
          label="وصول الإشعارات"
          value={stats?.pushReach ?? "—"}
          hint="الأجهزة التي وصلها آخر إشعار بث"
          icon={IconBell}
        />
        <Stat
          label="البث اليومي"
          value={stats ? (stats.liveEnabled ? stats.liveStartTime : "معطّل") : "—"}
          hint={stats?.nextLiveAt ? `القادم: ${formatCasablanca(stats.nextLiveAt)}` : undefined}
          icon={IconBroadcast}
        />
      </SimpleGrid>

      <Card padding="lg">
        <Text fw={600} fz="sm" mb="sm">
          آخر المحاولات
        </Text>
        <Table.ScrollContainer minWidth={520}>
          <Table highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>المستخدم</Table.Th>
                <Table.Th>السلسلة</Table.Th>
                <Table.Th>النتيجة</Table.Th>
                <Table.Th>التاريخ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(stats?.recentAttempts ?? []).map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td>
                    <Text size="sm" style={{ direction: "ltr" }}>
                      {a.userEmail}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {a.seriesId === 0 ? "امتحان تجريبي" : `#${a.seriesId}`}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={a.passed ? "green" : "red"} variant="light">
                      {a.score}/{a.total}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatCasablanca(a.finishedAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {stats && stats.recentAttempts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      لا توجد محاولات بعد.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
