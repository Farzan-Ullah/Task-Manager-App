import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import DashboardLayout from "./pages/DashboardLayout";
import Board from "./pages/Board";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Share from "./pages/Share";
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Register />} />
        <Route path="/share/:id" element={<Share />} />
        
        <Route path="/dash" element={<DashboardLayout />}>
          <Route index element={<Navigate to="board" />} />
          <Route path="board" element={<Board />} />
          <Route path="settings" element={<Settings />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
