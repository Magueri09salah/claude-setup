import { AppShell, Badge, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconBook2,
  IconCreditCard,
  IconLayoutGrid,
  IconLogout,
  IconPencil,
  IconUsers,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { PublishButton } from "./PublishButton";

const NAV: { to: string; label: string; icon: ComponentType<IconProps> }[] = [
  { to: "/series", label: "السلاسل", icon: IconLayoutGrid },
  { to: "/questions", label: "محرر الأسئلة", icon: IconPencil },
  { to: "/lessons", label: "الدروس", icon: IconBook2 },
  { to: "/users", label: "المستخدمون", icon: IconUsers },
  { to: "/payments", label: "المدفوعات", icon: IconCreditCard },
];

export function Shell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 232, breakpoint: "xs" }}
      padding="xl"
      styles={{ main: { backgroundColor: "var(--admin-bg)" } }}
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap={10} align="center">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text c="#fff" fw={800} fz={16} lh={1}>
                ط
              </Text>
            </div>
            <Text fw={700} fz={15}>
              طريق
            </Text>
          </Group>

          <Group gap="sm">
            <PublishButton />
            <Badge variant="default" size="lg" fw={500} style={{ direction: "ltr" }}>
              {user?.email}
            </Badge>
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconLogout size={16} />}
              onClick={logout}
            >
              تسجيل الخروج
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{ backgroundColor: "var(--admin-sidebar)" }}
      >
        <Text className="nav-eyebrow">القائمة</Text>
        <Stack gap={2}>
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <UnstyledButton
                key={item.to}
                component={Link}
                to={item.to}
                className={active ? "nav-item nav-item-active" : "nav-item"}
              >
                <Icon size={18} stroke={1.75} />
                {item.label}
              </UnstyledButton>
            );
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
