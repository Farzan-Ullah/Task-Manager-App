import React from "react";
import { Sun, Moon } from "lucide-react";
import { useApp } from "../../context/AppContext";

const ThemeToggle = ({ variant = "icon", className = "" }) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";

  if (variant === "menu-item") {
    return (
      <button
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${className}`}
      >
        <div className="flex items-center space-x-2">
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
          <span>{isDark ? "Light Theme" : "Dark Theme"}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 capitalize">
          {theme}
        </span>
      </button>
    );
  }

  if (variant === "switch") {
    return (
      <button
        onClick={toggleTheme}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 transition-all ${className}`}
        title={`Current: ${theme} theme. Click to toggle.`}
        aria-label="Toggle theme"
      >
        <div className="relative w-7 h-4 bg-gray-300 dark:bg-indigo-600 rounded-full transition-colors p-0.5">
          <div
            className={`w-3 h-3 rounded-full bg-white transition-transform ${
              isDark ? "translate-x-3" : "translate-x-0"
            }`}
          />
        </div>
        <span className="capitalize">{isDark ? "Dark" : "Light"}</span>
      </button>
    );
  }

  // Default "icon" variant
  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${className}`}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle light/dark theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-gray-600 dark:text-slate-300 transition-transform duration-300 -rotate-12 scale-100" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
