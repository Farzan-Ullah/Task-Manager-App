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
  const { user, isGuest } = useApp();

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

        {/* Guest Mode Informative Banner */}
        {isGuest && (
          <div className="bg-sky-50 dark:bg-sky-950/70 border-b border-sky-200/80 dark:border-sky-900/60 px-4 py-2 flex items-center justify-between text-xs text-sky-800 dark:text-sky-200 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-200/80 dark:bg-sky-900 text-sky-700 dark:text-sky-300 shrink-0">
                👁️
              </span>
              <span>
                <strong>Guest Stakeholder Mode:</strong> You have view and commenting access to this workspace. Task creation, status updates, and administrative settings are restricted.
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-900/60 px-2.5 py-0.5 rounded-full border border-sky-200/60 dark:border-sky-800/50">
              Read & Comment Only
            </span>
          </div>
        )}

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
