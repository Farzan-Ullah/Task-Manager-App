import React from "react";
import { Filter, User, Bug, Flame, CalendarClock, List } from "lucide-react";

export const FILTER_PRESETS = [
  { id: "all", label: "All Issues", icon: List },
  { id: "myOpen", label: "My Open Issues", icon: User },
  { id: "highBugs", label: "High Priority Bugs", icon: Bug },
  { id: "currentSprint", label: "Current Sprint", icon: Flame },
  { id: "overdue", label: "Overdue Tasks", icon: CalendarClock },
];

const ViewFilterPresets = ({ activePreset = "all", onSelectPreset, counts = {} }) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-slate-900/80 rounded-2xl border border-gray-200/60 dark:border-slate-800 text-xs">
      {FILTER_PRESETS.map((p) => {
        const Icon = p.icon;
        const count = counts[p.id];
        const isActive = activePreset === p.id;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPreset(p.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              isActive
                ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-gray-200/80 dark:ring-slate-700"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`} />
            <span>{p.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                    : "bg-gray-200/80 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ViewFilterPresets;
