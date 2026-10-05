import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import TopNavbar from "../components/common/TopNavbar";
import CreateIssueModal from "../components/issues/CreateIssueModal";
import GlobalSearchModal from "../components/common/GlobalSearchModal";
import IssueDetailModal from "../components/issues/IssueDetailModal";
import { useApp } from "../context/AppContext";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useApp();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* View Content Canvas */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50/60 dark:bg-slate-900/50 transition-colors duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <CreateIssueModal />
      <GlobalSearchModal />
      <IssueDetailModal />
    </div>
  );
};

export default DashboardLayout;
