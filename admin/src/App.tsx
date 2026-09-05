import { DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./admin.css";
import { AuthProvider, useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { AllowlistPage } from "./pages/AllowlistPage";
import { CourseRequestsPage } from "./pages/CourseRequestsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LessonsPage } from "./pages/LessonsPage";
import { LivesPage } from "./pages/LivesPage";
import { LoginPage } from "./pages/Login";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PracticalPage } from "./pages/PracticalPage";
import { QuestionEditorPage } from "./pages/QuestionEditorPage";
import { SeriesPage } from "./pages/SeriesPage";
import { ShopPage } from "./pages/ShopPage";
import { UsersPage } from "./pages/UsersPage";
import { theme } from "./theme";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Owner-only page. An assistant who types the URL by hand lands back on their
 * own home instead of on a screen full of failed requests. The real barrier is
 * server-side (see admin.router) — this is just the polite half.
 */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "ASSISTANT") return <Navigate to="/allowlist" replace />;
  return <>{children}</>;
}

/** Where "/" goes: the dashboard for the owner, the free group for a helper. */
function HomeRedirect() {
  const { user } = useAuth();
  return (
    <Navigate
      to={user?.role === "ASSISTANT" ? "/allowlist" : "/dashboard"}
      replace
    />
  );
}

export default function App() {
  return (
    <DirectionProvider>
      <MantineProvider theme={theme}>
        <Notifications position="top-center" />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAdmin>
                    <Shell />
                  </RequireAdmin>
                }
              >
                <Route path="/series" element={<AdminOnly><SeriesPage /></AdminOnly>} />
                <Route path="/questions" element={<AdminOnly><QuestionEditorPage /></AdminOnly>} />
                <Route path="/lessons" element={<AdminOnly><LessonsPage /></AdminOnly>} />
                <Route path="/practical" element={<AdminOnly><PracticalPage /></AdminOnly>} />
                <Route path="/course-requests" element={<AdminOnly><CourseRequestsPage /></AdminOnly>} />
                <Route path="/shop" element={<AdminOnly><ShopPage /></AdminOnly>} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/allowlist" element={<AllowlistPage />} />
                <Route path="/payments" element={<AdminOnly><PaymentsPage /></AdminOnly>} />
                <Route path="/lives" element={<AdminOnly><LivesPage /></AdminOnly>} />
                <Route path="/dashboard" element={<AdminOnly><DashboardPage /></AdminOnly>} />
                <Route path="/" element={<HomeRedirect />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </DirectionProvider>
  );
}
