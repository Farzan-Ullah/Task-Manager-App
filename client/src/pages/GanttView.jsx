import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  Bug,
  Bookmark,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { getSocket } from "../utils/socket";
import ViewFilterPresets from "../components/views/ViewFilterPresets";

const GanttView = () => {
  const { currentProject, user, setIsCreateIssueOpen } = useApp();

  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState("all");

  // Timeline window settings
  const [windowDays, setWindowDays] = useState(30); // 30 | 60 | 90
  const [startDateOffset, setStartDateOffset] = useState(-5); // start 5 days prior to today

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
      console.error("Failed to load Gantt data:", err);
      toast.error("Failed to load timeline");
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

  const activeSprintId = useMemo(() => {
    const active = sprints.find((s) => s.status === "ACTIVE");
    return active ? active._id : null;
  }, [sprints]);

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

  // Timeline boundary dates
  const timelineStart = useMemo(
    () => moment().startOf("day").add(startDateOffset, "days"),
    [startDateOffset]
  );
  const timelineEnd = useMemo(
    () => moment(timelineStart).add(windowDays, "days"),
    [timelineStart, windowDays]
  );

  // Scheduled vs Unscheduled
  const scheduledIssues = useMemo(() => {
    return filteredIssues.filter((i) => i.dueDate || i.startDate);
  }, [filteredIssues]);

  const unscheduledIssues = useMemo(() => {
    return filteredIssues.filter((i) => !i.dueDate && !i.startDate);
  }, [filteredIssues]);

  // Days list for header
  const timelineDays = useMemo(() => {
    const days = [];
    const curr = moment(timelineStart);
    for (let i = 0; i < windowDays; i++) {
      days.push({
        date: moment(curr),
        isToday: curr.isSame(moment(), "day"),
        isWeekend: curr.day() === 0 || curr.day() === 6,
      });
      curr.add(1, "day");
    }
    return days;
  }, [timelineStart, windowDays]);

  // Calculate task bar position
  const getTaskBarStyle = (issue) => {
    const start = issue.startDate
      ? moment(issue.startDate).startOf("day")
      : moment(issue.createdAt || issue.dueDate).startOf("day");
    const end = issue.dueDate
      ? moment(issue.dueDate).endOf("day")
      : moment(start).add(2, "days");

    const totalTimelineMs = timelineEnd.diff(timelineStart);
    const taskStartMs = Math.max(0, start.diff(timelineStart));
    const taskDurationMs = Math.max(86400000, end.diff(start));

    const leftPercent = Math.min(100, Math.max(0, (taskStartMs / totalTimelineMs) * 100));
    const widthPercent = Math.min(
      100 - leftPercent,
      Math.max(1.5, (taskDurationMs / totalTimelineMs) * 100)
    );

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const handleOpenDetail = (issueId) => {
    const targetId = typeof issueId === "object" ? (issueId?._id || issueId?.id) : issueId;
    if (targetId && targetId !== "[object Object]") {
      window.dispatchEvent(
        new CustomEvent("open-issue-detail", { detail: { issueId: targetId } })
      );
    }
  };

  const typeIcons = {
    Task: <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
    Bug: <Bug className="w-3.5 h-3.5 text-red-500 shrink-0" />,
    Story: <Bookmark className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
  };

  const statusGradients = {
    Done: "from-emerald-500 to-teal-500 text-white",
    "In Progress": "from-blue-600 to-indigo-600 text-white",
    Review: "from-purple-600 to-indigo-500 text-white",
    Testing: "from-amber-500 to-orange-500 text-white",
    "To Do": "from-gray-400 to-slate-500 text-white",
    Backlog: "from-gray-400 to-slate-400 text-white",
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject?.name} Gantt Timeline
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject?.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Visualize project schedule, issue spans, and milestones across weeks and months
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

      {/* Timeline Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStartDateOffset((prev) => prev - 7)}
            className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
            title="Slide 1 Week Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStartDateOffset(-5)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold text-gray-700 dark:text-slate-200"
          >
            Today
          </button>
          <button
            onClick={() => setStartDateOffset((prev) => prev + 7)}
            className="p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
            title="Slide 1 Week Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-gray-800 dark:text-slate-200 ml-2">
            {timelineStart.format("MMM D")} — {timelineEnd.format("MMM D, YYYY")}
          </span>
        </div>

        {/* Range window selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-gray-400 dark:text-slate-500 font-medium text-[11px]">View Range:</span>
          {[
            { days: 14, label: "2 Wks" },
            { days: 30, label: "1 Mo" },
            { days: 60, label: "2 Mos" },
          ].map((w) => (
            <button
              key={w.days}
              onClick={() => setWindowDays(w.days)}
              className={`px-2.5 py-1 rounded-xl font-semibold transition-all ${
                windowDays === w.days
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Gantt Split Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Side: Tasks Table (30%) */}
        <div className="w-full md:w-80 shrink-0 border-r border-gray-200/80 dark:border-slate-800 flex flex-col">
          <div className="h-10 px-4 bg-gray-50/80 dark:bg-slate-900/90 border-b border-gray-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
            <span>Issue</span>
            <span>Due Date</span>
          </div>

          <div className="flex-1 divide-y divide-gray-100 dark:divide-slate-800 overflow-y-auto">
            {scheduledIssues.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
                No scheduled issues found
              </div>
            ) : (
              scheduledIssues.map((iss) => (
                <div
                  key={iss._id}
                  onClick={() => handleOpenDetail(iss._id)}
                  className="h-11 px-4 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-slate-850 cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                    {typeIcons[iss.type] || typeIcons.Task}
                    <span className="font-mono font-bold text-[10px] text-gray-600 dark:text-slate-400 shrink-0">
                      {iss.key}
                    </span>
                    <span className="truncate font-medium text-gray-900 dark:text-slate-100">
                      {iss.title}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500 shrink-0">
                    {iss.dueDate ? moment(iss.dueDate).format("MMM D") : "No due"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Horizontal Timeline Canvas (70%) */}
        <div className="flex-1 overflow-x-auto flex flex-col">
          {/* Days Header */}
          <div className="h-10 bg-gray-50/80 dark:bg-slate-900/90 border-b border-gray-200/80 dark:border-slate-800 flex items-center shrink-0 min-w-max">
            {timelineDays.map((d, i) => (
              <div
                key={i}
                className={`w-9 text-center text-[10px] font-mono py-1 border-r border-gray-100 dark:border-slate-800 ${
                  d.isToday
                    ? "bg-indigo-100/60 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300"
                    : d.isWeekend
                    ? "bg-gray-100/50 dark:bg-slate-950/50 text-gray-400 dark:text-slate-500"
                    : "text-gray-500 dark:text-slate-400"
                }`}
              >
                <div>{d.date.format("D")}</div>
                <div className="text-[8px] uppercase">{d.date.format("ddd")}</div>
              </div>
            ))}
          </div>

          {/* Timeline Task Bars Area */}
          <div className="flex-1 relative divide-y divide-gray-100 dark:divide-slate-800 min-w-max">
            {/* Background day columns */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timelineDays.map((d, i) => (
                <div
                  key={i}
                  className={`w-9 border-r border-gray-100/60 dark:border-slate-800/60 h-full ${
                    d.isToday ? "bg-indigo-50/20 dark:bg-indigo-950/20" : d.isWeekend ? "bg-gray-50/40 dark:bg-slate-950/40" : ""
                  }`}
                />
              ))}
            </div>

            {/* Task Row Bars */}
            {scheduledIssues.map((iss) => {
              const barStyle = getTaskBarStyle(iss);
              const gradient =
                statusGradients[iss.status] || "from-indigo-600 to-indigo-500 text-white";

              return (
                <div key={iss._id} className="h-11 relative flex items-center px-1">
                  <div
                    onClick={() => handleOpenDetail(iss._id)}
                    style={barStyle}
                    className={`absolute h-7 rounded-xl bg-gradient-to-r ${gradient} shadow-xs px-2.5 flex items-center space-x-1.5 cursor-pointer hover:brightness-110 hover:shadow-md transition-all group z-10 truncate`}
                    title={`${iss.key}: ${iss.title} (${iss.status})`}
                  >
                    <span className="font-mono text-[10px] font-bold shrink-0">
                      {iss.key}
                    </span>
                    <span className="text-[11px] font-medium truncate">
                      {iss.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Section */}
      {unscheduledIssues.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Unscheduled Tasks ({unscheduledIssues.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unscheduledIssues.map((iss) => (
              <div
                key={iss._id}
                onClick={() => handleOpenDetail(iss._id)}
                className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 hover:bg-gray-100/70 dark:hover:bg-slate-800 hover:shadow-2xs cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2 min-w-0 mr-2">
                  {typeIcons[iss.type] || typeIcons.Task}
                  <span className="font-mono text-[11px] font-bold text-gray-600 dark:text-slate-400 shrink-0">
                    {iss.key}
                  </span>
                  <span className="truncate text-xs font-medium text-gray-900 dark:text-slate-100">
                    {iss.title}
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                  Set Dates
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttView;
