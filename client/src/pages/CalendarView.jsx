import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  Bug,
  Bookmark,
  Clock,
  AlertCircle,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { getSocket } from "../utils/socket";
import ViewFilterPresets from "../components/views/ViewFilterPresets";

const CalendarView = () => {
  const { currentProject, user, setIsCreateIssueOpen } = useApp();

  const [currentDate, setCurrentDate] = useState(moment());
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState("all");

  const fetchData = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [issuesRes, sprintsRes] = await Promise.all([
        api.get(`/v1/issues?projectId=${currentProject._id}&rootOnly=true&limit=500`),
        api.get(`/v1/sprints?projectId=${currentProject._id}`),
      ]);

      if (issuesRes.data.success) {
        setIssues(issuesRes.data.issues || []);
      }
      if (sprintsRes.data.success) {
        setSprints(sprintsRes.data.sprints || []);
      }
    } catch (err) {
      console.error("Failed to load calendar issues:", err);
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket updates
  useEffect(() => {
    if (!currentProject?._id) return;
    const socket = getSocket();

    const handleUpdated = (updated) => {
      if (updated.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === updated._id ? { ...i, ...updated } : i))
        );
      }
    };
    const handleCreated = (newIssue) => {
      if (newIssue.projectId === currentProject._id && !newIssue.parentId) {
        setIssues((prev) => [...prev, newIssue]);
      }
    };
    const handleDeleted = ({ issueId }) => {
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
    };

    socket.on("issue.created", handleCreated);
    socket.on("issue.updated", handleUpdated);
    socket.on("issue.moved", handleUpdated);
    socket.on("issue.deleted", handleDeleted);

    return () => {
      socket.off("issue.created", handleCreated);
      socket.off("issue.updated", handleUpdated);
      socket.off("issue.moved", handleUpdated);
      socket.off("issue.deleted", handleDeleted);
    };
  }, [currentProject?._id]);

  // Active Sprint helper
  const activeSprintId = useMemo(() => {
    const active = sprints.find((s) => s.status === "ACTIVE");
    return active ? active._id : null;
  }, [sprints]);

  // Preset Counts
  const presetCounts = useMemo(() => {
    const today = moment().startOf("day");
    return {
      all: issues.length,
      myOpen: issues.filter(
        (i) =>
          (i.assigneeId?._id === user?.userId || i.assigneeId === user?.userId) &&
          i.status !== "Done"
      ).length,
      highBugs: issues.filter(
        (i) =>
          i.type === "Bug" &&
          (i.priority === "Highest" || i.priority === "High") &&
          i.status !== "Done"
      ).length,
      currentSprint: activeSprintId
        ? issues.filter((i) => (i.sprintId?._id || i.sprintId) === activeSprintId).length
        : 0,
      overdue: issues.filter(
        (i) =>
          i.dueDate &&
          i.status !== "Done" &&
          moment(i.dueDate).isBefore(today)
      ).length,
    };
  }, [issues, user?.userId, activeSprintId]);

  // Filter Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (activePreset === "myOpen") {
        const isMy =
          iss.assigneeId?._id === user?.userId || iss.assigneeId === user?.userId;
        if (!isMy || iss.status === "Done") return false;
      } else if (activePreset === "highBugs") {
        if (
          iss.type !== "Bug" ||
          (iss.priority !== "Highest" && iss.priority !== "High") ||
          iss.status === "Done"
        ) {
          return false;
        }
      } else if (activePreset === "currentSprint") {
        if (!activeSprintId || (iss.sprintId?._id || iss.sprintId) !== activeSprintId) {
          return false;
        }
      } else if (activePreset === "overdue") {
        if (
          !iss.dueDate ||
          iss.status === "Done" ||
          !moment(iss.dueDate).isBefore(moment(), "day")
        ) {
          return false;
        }
      }
      return true;
    });
  }, [issues, activePreset, user?.userId, activeSprintId]);

  // Calendar Day Generation (Month Grid)
  const calendarDays = useMemo(() => {
    const startOfMonth = moment(currentDate).startOf("month");
    const endOfMonth = moment(currentDate).endOf("month");

    const startOfGrid = moment(startOfMonth).startOf("week");
    const endOfGrid = moment(endOfMonth).endOf("week");

    const days = [];
    const day = moment(startOfGrid);

    while (day.isBefore(endOfGrid) || day.isSame(endOfGrid, "day")) {
      const dateKey = day.format("YYYY-MM-DD");
      const dayIssues = filteredIssues.filter((i) => {
        if (!i.dueDate) return false;
        return moment(i.dueDate).format("YYYY-MM-DD") === dateKey;
      });

      days.push({
        date: moment(day),
        dateKey,
        isCurrentMonth: day.isSame(currentDate, "month"),
        isToday: day.isSame(moment(), "day"),
        issues: dayIssues,
      });

      day.add(1, "day");
    }

    return days;
  }, [currentDate, filteredIssues]);

  const handleOpenDetail = (issueId) => {
    const targetId = typeof issueId === "object" ? (issueId?._id || issueId?.id) : issueId;
    if (targetId && targetId !== "[object Object]") {
      window.dispatchEvent(
        new CustomEvent("open-issue-detail", { detail: { issueId: targetId } })
      );
    }
  };

  const typeIcons = {
    Task: <CheckSquare className="w-3 h-3 text-blue-500 shrink-0" />,
    Bug: <Bug className="w-3 h-3 text-red-500 shrink-0" />,
    Story: <Bookmark className="w-3 h-3 text-emerald-500 shrink-0" />,
  };

  const statusColorPills = {
    Done: "bg-emerald-50 text-emerald-700 border-emerald-200 line-through",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    Review: "bg-purple-50 text-purple-700 border-purple-200",
    Testing: "bg-amber-50 text-amber-700 border-amber-200",
    "To Do": "bg-gray-100 text-gray-700 border-gray-200",
    Backlog: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const unscheduledCount = issues.filter((i) => !i.dueDate).length;

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject?.name} Calendar
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject?.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Visualize deadlines, milestones, and deliverables on an interactive schedule
          </p>
        </div>

        <button
          onClick={() => setIsCreateIssueOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Issue</span>
        </button>
      </div>

      {/* Preset filter ribbon */}
      <ViewFilterPresets
        activePreset={activePreset}
        onSelectPreset={setActivePreset}
        counts={presetCounts}
      />

      {/* Month Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 min-w-44">
            {currentDate.format("MMMM YYYY")}
          </h2>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentDate(moment(currentDate).subtract(1, "month"))}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(moment())}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(moment(currentDate).add(1, "month"))}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {unscheduledCount > 0 && (
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            <span>
              {unscheduledCount} unscheduled task{unscheduledCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/90 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-center py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 dark:divide-slate-800 min-h-[600px]">
          {calendarDays.map((cd, index) => {
            return (
              <div
                key={cd.dateKey}
                className={`p-2 flex flex-col justify-between min-h-[110px] transition-colors group ${
                  !cd.isCurrentMonth
                    ? "bg-gray-50/40 dark:bg-slate-950/40 text-gray-300 dark:text-slate-600"
                    : cd.isToday
                    ? "bg-indigo-50/20 dark:bg-indigo-950/20"
                    : "bg-white dark:bg-slate-900 hover:bg-gray-50/40 dark:hover:bg-slate-850"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`font-mono text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                      cd.isToday
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : cd.isCurrentMonth
                        ? "text-gray-700 dark:text-slate-200"
                        : "text-gray-300 dark:text-slate-600"
                    }`}
                  >
                    {cd.date.format("D")}
                  </span>

                  <button
                    onClick={() => setIsCreateIssueOpen(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-opacity"
                    title={`Create issue due ${cd.date.format("MMM D")}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Issues on this day */}
                <div className="space-y-1 overflow-y-auto max-h-24">
                  {cd.issues.slice(0, 3).map((iss) => {
                    const isOverdue =
                      iss.status !== "Done" &&
                      moment(iss.dueDate).isBefore(moment(), "day");

                    return (
                      <div
                        key={iss._id}
                        onClick={() => handleOpenDetail(iss._id)}
                        className={`p-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-all hover:shadow-2xs flex items-center space-x-1.5 truncate ${
                          isOverdue
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900"
                            : statusColorPills[iss.status] || "bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        }`}
                        title={`${iss.key}: ${iss.title} (${iss.status})`}
                      >
                        {typeIcons[iss.type] || typeIcons.Task}
                        <span className="font-mono font-bold text-[10px] shrink-0">
                          {iss.key}
                        </span>
                        <span className="truncate">{iss.title}</span>
                      </div>
                    );
                  })}

                  {cd.issues.length > 3 && (
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 block text-center">
                      +{cd.issues.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
