import { AppShell, Badge, Button, Group, NavLink, Text } from "@mantine/core";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { PublishButton } from "./PublishButton";

const NAV = [
  { to: "/series", label: "السلاسل" },
  { to: "/questions", label: "محرر الأسئلة" },
  { to: "/lessons", label: "الدروس" },
];

export function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: "xs" }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="xs">
            <Text fw={800}>طريق</Text>
            <Text c="dimmed" fw={700}>
              لوحة الإدارة
            </Text>
          </Group>
          <Group gap="sm">
            <PublishButton />
            <Badge variant="light" radius="sm" style={{ direction: "ltr" }}>
              {user?.email}
            </Badge>
            <Button variant="subtle" size="xs" onClick={logout}>
              تسجيل الخروج
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            active={location.pathname === item.to}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
