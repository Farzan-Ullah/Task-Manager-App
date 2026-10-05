import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  Plus,
  Download,
  Calendar,
  Filter,
  Users,
  Search,
  RotateCcw,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import TimesheetSummaryCards from "../components/timesheets/TimesheetSummaryCards";
import TimesheetAnalyticsSection from "../components/timesheets/TimesheetAnalyticsSection";
import TimeLogTable from "../components/timesheets/TimeLogTable";
import LogTimeModal from "../components/timesheets/LogTimeModal";

const Timesheets = () => {
  const { currentProject } = useApp();

  const [timeLogs, setTimeLogs] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [preset, setPreset] = useState("thisWeek"); // "today" | "thisWeek" | "lastWeek" | "thisMonth" | "all" | "custom"
  const [startDate, setStartDate] = useState(
    moment().startOf("isoWeek").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    moment().endOf("isoWeek").format("YYYY-MM-DD")
  );
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Handle Preset Changes
  const handlePresetChange = (p) => {
    setPreset(p);
    if (p === "today") {
      const today = moment().format("YYYY-MM-DD");
      setStartDate(today);
      setEndDate(today);
    } else if (p === "thisWeek") {
      setStartDate(moment().startOf("isoWeek").format("YYYY-MM-DD"));
      setEndDate(moment().endOf("isoWeek").format("YYYY-MM-DD"));
    } else if (p === "lastWeek") {
      setStartDate(
        moment().subtract(1, "weeks").startOf("isoWeek").format("YYYY-MM-DD")
      );
      setEndDate(
        moment().subtract(1, "weeks").endOf("isoWeek").format("YYYY-MM-DD")
      );
    } else if (p === "thisMonth") {
      setStartDate(moment().startOf("month").format("YYYY-MM-DD"));
      setEndDate(moment().endOf("month").format("YYYY-MM-DD"));
    } else if (p === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Fetch Time Logs & Summary
  const fetchTimesheetData = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId: currentProject._id,
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedUserId !== "all") params.append("userId", selectedUserId);

      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/v1/time-logs?${params.toString()}`),
        api.get(`/v1/time-logs/summary?${params.toString()}`),
      ]);

      if (logsRes.data.success) {
        setTimeLogs(logsRes.data.timeLogs || []);
      }

      if (summaryRes.data.success) {
        setSummaryData(summaryRes.data);
      }
    } catch (err) {
      console.error("Failed to load timesheet data:", err);
      toast.error("Failed to load timesheet");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id, startDate, endDate, selectedUserId]);

  useEffect(() => {
    fetchTimesheetData();
  }, [fetchTimesheetData]);

  // Delete Log Entry
  const handleDeleteLog = async (logId) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    try {
      const res = await api.delete(`/v1/time-logs/${logId}`);
      if (res.data.success) {
        toast.success("Time log entry deleted");
        fetchTimesheetData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete time log");
    }
  };

  // Filtered Logs by Search Query
  const filteredTimeLogs = useMemo(() => {
    if (!searchQuery.trim()) return timeLogs;
    const q = searchQuery.toLowerCase();
    return timeLogs.filter((t) => {
      const key = (t.issueId?.key || "").toLowerCase();
      const title = (t.issueId?.title || "").toLowerCase();
      const note = (t.note || "").toLowerCase();
      const userName = (t.userId?.name || "").toLowerCase();
      return (
        key.includes(q) || title.includes(q) || note.includes(q) || userName.includes(q)
      );
    });
  }, [timeLogs, searchQuery]);

  // Computed Summary Metrics
  const metrics = useMemo(() => {
    const totalMinutes = summaryData?.totalMinutes || 0;
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Compute today's hours from timeLogs
    const todayStr = moment().format("YYYY-MM-DD");
    const todayMinutes = timeLogs
      .filter((t) => moment(t.date).format("YYYY-MM-DD") === todayStr)
      .reduce((acc, t) => acc + (t.minutes || 0), 0);
    const todayHours = (todayMinutes / 60).toFixed(1);

    const activeContributors = (summaryData?.byUser || []).length;
    const activeDays = (summaryData?.byDate || []).length;
    const dailyAverage =
      activeDays > 0 ? (totalMinutes / 60 / activeDays).toFixed(1) : "0.0";

    return {
      totalHours,
      todayHours,
      activeContributors,
      dailyAverage,
      entriesCount: timeLogs.length,
    };
  }, [summaryData, timeLogs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTimeLogs.length === 0) {
      toast.info("No time logs to export");
      return;
    }

    const headers = ["Date", "Member Name", "Member Email", "Issue Key", "Issue Title", "Hours", "Minutes", "Work Note"];
    const rows = filteredTimeLogs.map((log) => [
      moment(log.date).format("YYYY-MM-DD"),
      `"${log.userId?.name || ""}"`,
      `"${log.userId?.email || ""}"`,
      log.issueId?.key || "N/A",
      `"${(log.issueId?.title || "").replace(/"/g, '""')}"`,
      (log.minutes / 60).toFixed(2),
      log.minutes,
      `"${(log.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `timesheet_${currentProject?.key || "proj"}_${moment().format("YYYYMMDD")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Timesheet CSV exported!");
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">No Project Selected</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mb-4">
            Select a project in the navigation bar to view and log work hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject.name} Timesheets
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Audit logged work hours, team velocity, and project effort distribution
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Time</span>
          </button>
        </div>
      </div>

      {/* Date Range & Member Filter Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "thisWeek", label: "This Week" },
              { id: "lastWeek", label: "Last Week" },
              { id: "thisMonth", label: "This Month" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  preset === p.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200/80 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Member Picker */}
          <div className="flex items-center space-x-2">
            <Users className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40 text-xs"
            >
              <option value="all">All Members</option>
              {(currentProject.members || []).map((m) => (
                <option
                  key={m.userId?._id || m.userId}
                  value={m.userId?._id || m.userId}
                >
                  {m.userId?.name || m.userId?.email || "Member"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Pickers & Text Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs">
          {preset === "custom" && (
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-gray-400 dark:text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search time logs by issue or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <TimesheetSummaryCards
        totalHours={metrics.totalHours}
        todayHours={metrics.todayHours}
        activeContributors={metrics.activeContributors}
        dailyAverage={metrics.dailyAverage}
        entriesCount={metrics.entriesCount}
      />

      {/* Analytics Visual Breakdown */}
      <TimesheetAnalyticsSection
        byDate={summaryData?.byDate || []}
        byUser={summaryData?.byUser || []}
        totalMinutes={summaryData?.totalMinutes || 0}
      />

      {/* Detailed Entries Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Logged Work Entries ({filteredTimeLogs.length})
          </h2>
        </div>
        <TimeLogTable
          timeLogs={filteredTimeLogs}
          onDeleteLog={handleDeleteLog}
          loading={loading}
        />
      </div>

      {/* Manual Time Log Modal */}
      <LogTimeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        currentProject={currentProject}
        onTimeLogged={() => {
          fetchTimesheetData();
        }}
      />
    </div>
  );
};

export default Timesheets;
