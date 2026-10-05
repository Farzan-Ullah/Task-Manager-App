import React from "react";
import { Sun, Moon } from "lucide-react";
import { useApp } from "../../context/AppContext";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";

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
