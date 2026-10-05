import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./pages/DashboardLayout";
import Board from "./pages/Board";
import Backlog from "./pages/Backlog";
import ListView from "./pages/ListView";
import CalendarView from "./pages/CalendarView";
import GanttView from "./pages/GanttView";
import Timesheets from "./pages/Timesheets";
import Reports from "./pages/Reports";
import Automations from "./pages/Automations";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Share from "./pages/Share";
import { Toaster } from "sonner";
import { AppProvider } from "./context/AppContext";

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/share/:id" element={<Share />} />

          <Route path="/dash" element={<DashboardLayout />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<Board />} />
            <Route path="backlog" element={<Backlog />} />
            <Route path="list" element={<ListView />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="gantt" element={<GanttView />} />
            <Route path="timesheets" element={<Timesheets />} />
            <Route path="reports" element={<Reports />} />
            <Route path="automations" element={<Automations />} />
            <Route path="settings" element={<Settings />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>

          {/* Fallback to dash or login */}
          <Route path="*" element={<Navigate to="/dash/board" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
