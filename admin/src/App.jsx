import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/Overview";
import Submissions from "./pages/Submissions";
import CalendarPage from "./pages/CalendarPage";
import Meetings from "./pages/Meetings";
import "./index.css";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LoginRedirect() {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="submissions" element={<Submissions />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="meetings" element={<Meetings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
