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
import { DashboardPage } from "./pages/DashboardPage";
import { LessonsPage } from "./pages/LessonsPage";
import { LivesPage } from "./pages/LivesPage";
import { LoginPage } from "./pages/Login";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PracticalPage } from "./pages/PracticalPage";
import { QuestionEditorPage } from "./pages/QuestionEditorPage";
import { SeriesPage } from "./pages/SeriesPage";
import { UsersPage } from "./pages/UsersPage";
import { theme } from "./theme";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
                <Route path="/series" element={<SeriesPage />} />
                <Route path="/questions" element={<QuestionEditorPage />} />
                <Route path="/lessons" element={<LessonsPage />} />
                <Route path="/practical" element={<PracticalPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/allowlist" element={<AllowlistPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/lives" element={<LivesPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </DirectionProvider>
  );
}
