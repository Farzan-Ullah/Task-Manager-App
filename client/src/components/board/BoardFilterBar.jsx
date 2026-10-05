import React from "react";
import { Filter, SlidersHorizontal, X, User } from "lucide-react";
import { useApp } from "../../context/AppContext";

const BoardFilterBar = ({
  filters,
  onFilterChange,
  onClearFilters,
  members = [],
  sprints = [],
  onOpenColumnConfig,
}) => {
  const { user } = useApp();

  const hasActiveFilters =
    filters.search ||
    filters.sprintId !== "all" ||
    filters.assigneeId !== "all" ||
    filters.priority !== "all" ||
    filters.type !== "all";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-slate-400 mr-1">
          <Filter className="w-3.5 h-3.5 mr-1" />
          <span>Filters:</span>
        </div>

        {/* Sprint Filter */}
        <select
          value={filters.sprintId}
          onChange={(e) => onFilterChange("sprintId", e.target.value)}
          className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Sprints</option>
          <option value="backlog">Backlog Only</option>
          {sprints.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          value={filters.assigneeId}
          onChange={(e) => onFilterChange("assigneeId", e.target.value)}
          className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Assignees</option>
          {user?.userId && <option value={user.userId}>Assigned to Me</option>}
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
              {m.userId?.name || m.userId?.email || "Member"}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange("priority", e.target.value)}
          className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Priorities</option>
          <option value="Highest">Highest</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
          <option value="Lowest">Lowest</option>
        </select>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => onFilterChange("type", e.target.value)}
          className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="Task">Task</option>
          <option value="Bug">Bug</option>
          <option value="Story">Story</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Column Config Trigger */}
      <button
        onClick={onOpenColumnConfig}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors shrink-0"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Columns & WIP</span>
      </button>
    </div>
  );
};

export default BoardFilterBar;
