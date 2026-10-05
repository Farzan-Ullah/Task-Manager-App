import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table as TableIcon,
  Search,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Bug,
  Bookmark,
  Calendar,
  Trash2,
  UserCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { getSocket } from "../utils/socket";
import ViewFilterPresets from "../components/views/ViewFilterPresets";

const ListView = () => {
  const { currentProject, user, setIsCreateIssueOpen } = useApp();

  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Presets
  const [activePreset, setActivePreset] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Sorting
  const [sortField, setSortField] = useState("key");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" | "desc"

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch Data
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
      console.error("Failed to load list view:", err);
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time socket listeners
  useEffect(() => {
    if (!currentProject?._id) return;
    const socket = getSocket();

    const handleCreated = (newIssue) => {
      if (newIssue.projectId === currentProject._id && !newIssue.parentId) {
        setIssues((prev) => [newIssue, ...prev]);
      }
    };

    const handleUpdated = (updatedIssue) => {
      if (updatedIssue.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === updatedIssue._id ? { ...i, ...updatedIssue } : i))
        );
      }
    };

    const handleDeleted = ({ issueId }) => {
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
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

  // Active Sprint ID helper
  const activeSprintId = useMemo(() => {
    const active = sprints.find((s) => s.status === "ACTIVE");
    return active ? active._id : null;
  }, [sprints]);

  // Compute preset counts
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
      // Preset conditions
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

      // Column filters
      if (typeFilter !== "all" && iss.type !== typeFilter) return false;
      if (statusFilter !== "all" && iss.status !== statusFilter) return false;
      if (priorityFilter !== "all" && iss.priority !== priorityFilter) return false;
      if (assigneeFilter === "unassigned" && iss.assigneeId) return false;
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "unassigned" &&
        iss.assigneeId?._id !== assigneeFilter &&
        iss.assigneeId !== assigneeFilter
      ) {
        return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesKey = (iss.key || "").toLowerCase().includes(q);
        const matchesTitle = (iss.title || "").toLowerCase().includes(q);
        if (!matchesKey && !matchesTitle) return false;
      }

      return true;
    });
  }, [
    issues,
    activePreset,
    user?.userId,
    activeSprintId,
    typeFilter,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    search,
  ]);

  // Sort Issues
  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "assigneeId") {
        aVal = a.assigneeId?.name || a.assigneeId?.email || "";
        bVal = b.assigneeId?.name || b.assigneeId?.email || "";
      } else if (sortField === "sprintId") {
        aVal = a.sprintId?.name || "";
        bVal = b.sprintId?.name || "";
      }

      if (aVal === undefined || aVal === null) aVal = "";
      if (bVal === undefined || bVal === null) bVal = "";

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredIssues, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sortedIssues.map((i) => i._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Update
  const handleBulkUpdate = async (field, value) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await api.post("/v1/issues/bulk/update", {
        issueIds: Array.from(selectedIds),
        updates: { [field]: value },
      });

      if (res.data.success) {
        toast.success(`Updated ${res.data.updatedCount} issues`);
        fetchData();
        setSelectedIds(new Set());
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update issues");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected issues?`)) return;

    setBulkActionLoading(true);
    try {
      const res = await api.post("/v1/issues/bulk/delete", {
        issueIds: Array.from(selectedIds),
      });

      if (res.data.success) {
        toast.success(`Deleted ${res.data.deletedCount} issues`);
        fetchData();
        setSelectedIds(new Set());
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete issues");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Inline Field Update
  const handleInlineUpdate = async (issueId, field, value) => {
    try {
      const res = await api.patch(`/v1/issues/${issueId}`, { [field]: value });
      if (res.data.success) {
        setIssues((prev) =>
          prev.map((i) => (i._id === issueId ? { ...i, ...res.data.issue } : i))
        );
        toast.success(`Updated ${field}`);
      }
    } catch {
      toast.error("Failed to update field");
    }
  };

  const handleRowClick = (issueId) => {
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

  const priorityColors = {
    Highest: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-amber-500",
    Low: "bg-blue-500",
    Lowest: "bg-gray-400",
  };

  const isAllSelected =
    sortedIssues.length > 0 && selectedIds.size === sortedIssues.length;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject?.name} List View
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject?.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Spreadsheet-style multi-column issue grid with inline editing and bulk actions
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

      {/* Filter Presets Ribbon */}
      <ViewFilterPresets
        activePreset={activePreset}
        onSelectPreset={setActivePreset}
        counts={presetCounts}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by summary or key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-xs outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="all">All Types</option>
          <option value="Story">Story</option>
          <option value="Task">Task</option>
          <option value="Bug">Bug</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="all">All Statuses</option>
          <option value="Backlog">Backlog</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Review">Review</option>
          <option value="Testing">Testing</option>
          <option value="Done">Done</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="all">All Priorities</option>
          <option value="Highest">Highest</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
          <option value="Lowest">Lowest</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {(currentProject?.members || []).map((m) => (
            <option
              key={m.userId?._id || m.userId}
              value={m.userId?._id || m.userId}
            >
              {m.userId?.name || m.userId?.email || "Member"}
            </option>
          ))}
        </select>

        {(search ||
          typeFilter !== "all" ||
          statusFilter !== "all" ||
          priorityFilter !== "all" ||
          assigneeFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatusFilter("all");
              setPriorityFilter("all");
              setAssigneeFilter("all");
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-900 text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold bg-indigo-800 px-2.5 py-1 rounded-xl">
              {selectedIds.size} Selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-indigo-200 hover:text-white underline text-[11px]"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Bulk Status */}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleBulkUpdate("status", e.target.value);
              }}
              className="bg-indigo-800 text-white px-2.5 py-1.5 rounded-xl border border-indigo-700 font-semibold outline-none"
            >
              <option value="" disabled>
                Change Status...
              </option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Testing">Testing</option>
              <option value="Done">Done</option>
            </select>

            {/* Bulk Priority */}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleBulkUpdate("priority", e.target.value);
              }}
              className="bg-indigo-800 text-white px-2.5 py-1.5 rounded-xl border border-indigo-700 font-semibold outline-none"
            >
              <option value="" disabled>
                Change Priority...
              </option>
              <option value="Highest">Highest</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Lowest">Lowest</option>
            </select>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-slate-900/90 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-700 focus:ring-indigo-500"
                  />
                </th>
                <th
                  onClick={() => handleSort("key")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Key</span>
                    {sortField === "key" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 min-w-[200px]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Summary</span>
                    {sortField === "title" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortField === "status" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("priority")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority</span>
                    {sortField === "priority" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("assigneeId")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Assignee</span>
                    {sortField === "assigneeId" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("estimate")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Pts</span>
                    {sortField === "estimate" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dueDate")}
                  className="py-3 px-3 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Due Date</span>
                    {sortField === "dueDate" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
                    Loading issues...
                  </td>
                </tr>
              ) : sortedIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
                    No issues match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedIssues.map((iss) => {
                  const isSelected = selectedIds.has(iss._id);
                  const isOverdue =
                    iss.dueDate &&
                    iss.status !== "Done" &&
                    moment(iss.dueDate).isBefore(moment(), "day");

                  return (
                    <tr
                      key={iss._id}
                      onClick={() => handleRowClick(iss._id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60"
                          : "hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(iss._id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(iss._id)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Key & Type */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] font-bold text-gray-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          {typeIcons[iss.type] || typeIcons.Task}
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {iss.key}
                          </span>
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-3 font-semibold text-gray-900 dark:text-slate-100 max-w-sm truncate">
                        <span
                          className={
                            iss.status === "Done" ? "text-gray-400 dark:text-slate-500 line-through" : ""
                          }
                        >
                          {iss.title}
                        </span>
                      </td>

                      {/* Status (Inline Select) */}
                      <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={iss.status}
                          onChange={(e) =>
                            handleInlineUpdate(iss._id, "status", e.target.value)
                          }
                          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-[11px] text-gray-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Backlog">Backlog</option>
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Testing">Testing</option>
                          <option value="Done">Done</option>
                        </select>
                      </td>

                      {/* Priority (Inline Select) */}
                      <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              priorityColors[iss.priority] || "bg-gray-400"
                            }`}
                          />
                          <select
                            value={iss.priority}
                            onChange={(e) =>
                              handleInlineUpdate(iss._id, "priority", e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-[11px] text-gray-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Highest">Highest</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                            <option value="Lowest">Lowest</option>
                          </select>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {iss.assigneeId ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                                {(iss.assigneeId.name || iss.assigneeId.email || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span className="text-gray-800 dark:text-slate-200 font-medium">
                                {iss.assigneeId.name || iss.assigneeId.email}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                          )}
                        </div>
                      </td>

                      {/* Estimate */}
                      <td className="py-3 px-3 font-mono font-bold text-gray-700 dark:text-slate-300">
                        {iss.estimate ? `${iss.estimate} pts` : "-"}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium">
                        {iss.dueDate ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isOverdue
                                ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-bold"
                                : "text-gray-600 dark:text-slate-400"
                            }`}
                          >
                            {moment(iss.dueDate).format("MMM D, YYYY")}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ListView;
