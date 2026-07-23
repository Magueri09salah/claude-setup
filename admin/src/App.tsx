import { DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { AuthProvider, useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LessonsPage } from "./pages/LessonsPage";
import { LoginPage } from "./pages/Login";
import { QuestionEditorPage } from "./pages/QuestionEditorPage";
import { SeriesPage } from "./pages/SeriesPage";
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
                <Route path="/" element={<Navigate to="/series" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </DirectionProvider>
  );
}
