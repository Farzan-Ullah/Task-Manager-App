import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import ProjectSwitcher from "./ProjectSwitcher";
import TimerWidget from "./TimerWidget";
import NotificationsPopover from "./NotificationsPopover";
import ThemeToggle from "./ThemeToggle";
import { Search, Plus, LogOut, Settings as SettingsIcon, Menu, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const TopNavbar = ({ onToggleSidebar }) => {
  const { user, setUser, setIsCreateIssueOpen, setIsSearchOpen, isGuest, userWorkspaceRole } = useApp();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout");
      sessionStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeWorkspaceId");
      localStorage.removeItem("activeProjectId");
      localStorage.removeItem("promanage_active_timer");
      localStorage.removeItem("promanage_theme");
      setUser(null);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200/80 dark:border-slate-800 px-4 flex items-center justify-between z-30 shrink-0 transition-colors duration-200">
      {/* Left: Mobile hamburger + Switchers */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 md:hidden rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <WorkspaceSwitcher />
        <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">/</span>
        <ProjectSwitcher />

        {isGuest && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
            <Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Guest Access</span>
          </div>
        )}
      </div>

      {/* Center: Search Bar Trigger */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-750 bg-gray-50/60 dark:bg-slate-800/60 hover:bg-gray-100/80 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors text-xs"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
            <span>Search issues...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 dark:text-slate-400 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Create, Timer, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center space-x-2">
        {/* Quick Create Issue Button (Hidden for Guests) */}
        {!isGuest ? (
          <button
            onClick={() => setIsCreateIssueOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create</span>
          </button>
        ) : (
          <div className="sm:hidden flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            <Eye className="w-3 h-3 text-sky-600" />
            <span>Guest</span>
          </div>
        )}

        {/* Live Timer Widget (Hidden for Guests) */}
        {!isGuest && (
          <div className="hidden lg:block">
            <TimerWidget />
          </div>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <NotificationsPopover />

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  isGuest
                    ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40"
                }`}>
                  {isGuest ? "Guest (Stakeholder)" : userWorkspaceRole || user?.role || "Member"}
                </span>
              </div>

              {/* Theme Toggle within menu */}
              <div className="py-1 border-b border-gray-100 dark:border-slate-800">
                <ThemeToggle variant="menu-item" />
              </div>

              {!isGuest && (
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate("/dash/settings");
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 mr-2.5 text-gray-400 dark:text-slate-400" />
                    Settings
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-slate-800 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2.5 text-red-500 dark:text-red-400" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
