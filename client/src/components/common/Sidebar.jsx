import React from "react";
import { NavLink } from "react-router-dom";
import {
  Kanban,
  ListTodo,
  Table,
  Calendar,
  BarChart3,
  Clock,
  LineChart,
  Zap,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import ThemeToggle from "./ThemeToggle";

const navigationItems = [
  { name: "Kanban Board", path: "/dash/board", icon: Kanban },
  { name: "Backlog & Sprints", path: "/dash/backlog", icon: ListTodo },
  { name: "List View", path: "/dash/list", icon: Table },
  { name: "Calendar", path: "/dash/calendar", icon: Calendar },
  { name: "Gantt Timeline", path: "/dash/gantt", icon: BarChart3 },
  { name: "Timesheets", path: "/dash/timesheets", icon: Clock },
  { name: "Reports & Analytics", path: "/dash/reports", icon: LineChart },
  { name: "Automations", path: "/dash/automations", icon: Zap },
  { name: "Settings", path: "/dash/settings", icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { currentProject, currentWorkspace } = useApp();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 bg-white dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Logo / Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-xs">
                <Shield className="text-white h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                Pro Manage
              </span>
            </div>

            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Project Pill */}
          {currentProject && (
            <div className="px-3 pt-4 pb-2">
              <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                  Active Project
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                    {currentProject.name}
                  </p>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                    {currentProject.key}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-0.5">
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/50 shadow-2xs"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-100/70 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-slate-100"
                  }`
                }
              >
                <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Area with Theme Switcher & Workspace Info */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
          {/* Quick theme switcher row in sidebar */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Theme</span>
            <ThemeToggle variant="switch" />
          </div>

          <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50/50 dark:from-slate-800/80 to-purple-50/50 dark:to-slate-800/80 border border-indigo-100/50 dark:border-slate-700/60 text-[11px] text-gray-600 dark:text-slate-300">
            <span className="font-semibold text-indigo-900 dark:text-indigo-400">Workspace</span>
            <p className="truncate text-gray-500 dark:text-slate-400 mt-0.5">
              {currentWorkspace?.name || "Pro Manage App"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
