import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  CheckCircle2,
  Calendar,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { getSocket } from "../utils/socket";
import SprintGroup from "../components/sprints/SprintGroup";
import CreateSprintModal from "../components/sprints/CreateSprintModal";
import StartSprintModal from "../components/sprints/StartSprintModal";
import CompleteSprintModal from "../components/sprints/CompleteSprintModal";
import EditSprintModal from "../components/sprints/EditSprintModal";

const Backlog = () => {
  const { currentProject, setIsCreateIssueOpen, isGuest, isManager } = useApp();

  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Modal States
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [startSprintTarget, setStartSprintTarget] = useState(null);
  const [completeSprintTarget, setCompleteSprintTarget] = useState(null);
  const [editSprintTarget, setEditSprintTarget] = useState(null);

  // Fetch Sprints & Issues
  const fetchData = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sprintsRes, issuesRes] = await Promise.all([
        api.get(`/v1/sprints?projectId=${currentProject._id}`),
        api.get(`/v1/issues?projectId=${currentProject._id}&rootOnly=true&limit=300`),
      ]);

      if (sprintsRes.data.success) {
        setSprints(sprintsRes.data.sprints || []);
      }
      if (issuesRes.data.success) {
        setIssues(issuesRes.data.issues || []);
      }
    } catch (err) {
      console.error("Failed to load backlog data:", err);
      toast.error("Failed to load backlog");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO Listeners for real-time collaboration
  useEffect(() => {
    if (!currentProject?._id) return;
    const socket = getSocket();

    const handleSprintCreated = (newSprint) => {
      if (newSprint.projectId === currentProject._id) {
        setSprints((prev) => {
          if (prev.some((s) => s._id === newSprint._id)) return prev;
          return [newSprint, ...prev];
        });
      }
    };

    const handleSprintUpdated = (updatedSprint) => {
      if (updatedSprint.projectId === currentProject._id) {
        setSprints((prev) =>
          prev.map((s) => (s._id === updatedSprint._id ? { ...s, ...updatedSprint } : s))
        );
      }
    };

    const handleSprintDeleted = ({ sprintId }) => {
      setSprints((prev) => prev.filter((s) => s._id !== sprintId));
      // Re-fetch issues to ensure rolled back issues reflect backlog
      fetchData();
    };

    const handleIssueCreated = (newIssue) => {
      if (newIssue.projectId === currentProject._id && !newIssue.parentId) {
        setIssues((prev) => {
          if (prev.some((i) => i._id === newIssue._id)) return prev;
          return [...prev, newIssue];
        });
      }
    };

    const handleIssueUpdated = (updatedIssue) => {
      if (updatedIssue.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === updatedIssue._id ? { ...i, ...updatedIssue } : i))
        );
      }
    };

    const handleIssueMoved = (movedIssue) => {
      if (movedIssue.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === movedIssue._id ? { ...i, ...movedIssue } : i))
        );
      }
    };

    const handleIssueDeleted = ({ issueId }) => {
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
    };

    socket.on("sprint.created", handleSprintCreated);
    socket.on("sprint.started", handleSprintUpdated);
    socket.on("sprint.completed", handleSprintUpdated);
    socket.on("sprint.updated", handleSprintUpdated);
    socket.on("sprint.deleted", handleSprintDeleted);
    socket.on("issue.created", handleIssueCreated);
    socket.on("issue.updated", handleIssueUpdated);
    socket.on("issue.moved", handleIssueMoved);
    socket.on("issue.deleted", handleIssueDeleted);

    return () => {
      socket.off("sprint.created", handleSprintCreated);
      socket.off("sprint.started", handleSprintUpdated);
      socket.off("sprint.completed", handleSprintUpdated);
      socket.off("sprint.updated", handleSprintUpdated);
      socket.off("sprint.deleted", handleSprintDeleted);
      socket.off("issue.created", handleIssueCreated);
      socket.off("issue.updated", handleIssueUpdated);
      socket.off("issue.moved", handleIssueMoved);
      socket.off("issue.deleted", handleIssueDeleted);
    };
  }, [currentProject?._id, fetchData]);

  // Filter Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (typeFilter !== "all" && iss.type !== typeFilter) return false;
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
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesKey = (iss.key || "").toLowerCase().includes(q);
        const matchesTitle = (iss.title || "").toLowerCase().includes(q);
        if (!matchesKey && !matchesTitle) return false;
      }
      return true;
    });
  }, [issues, search, typeFilter, priorityFilter, assigneeFilter]);

  // Partition sprints
  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === "ACTIVE"),
    [sprints]
  );
  const plannedSprints = useMemo(
    () => sprints.filter((s) => s.status === "PLANNED"),
    [sprints]
  );

  // Group filtered issues by container
  const getIssuesForContainer = useCallback(
    (containerSprintId) => {
      if (!containerSprintId) {
        // Backlog issues
        return filteredIssues
          .filter((i) => !i.sprintId || i.sprintId === null)
          .sort((a, b) => (a.rank < b.rank ? -1 : 1));
      }
      return filteredIssues
        .filter((i) => (i.sprintId?._id || i.sprintId) === containerSprintId)
        .sort((a, b) => (a.rank < b.rank ? -1 : 1));
    },
    [filteredIssues]
  );

  // Drag and Drop Handler
  const handleDragEnd = async (result) => {
    if (isGuest) {
      toast.info("Guest users have read-only backlog access. Moving tasks is restricted.");
      return;
    }

    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceSprintId =
      source.droppableId === "backlog"
        ? null
        : source.droppableId.replace("sprint:", "");
    const destSprintId =
      destination.droppableId === "backlog"
        ? null
        : destination.droppableId.replace("sprint:", "");

    const previousIssuesSnapshot = [...issues];

    // Find destination container's current cards
    const destCards = getIssuesForContainer(destSprintId).filter(
      (i) => i._id !== draggableId
    );

    const prevIssue = destination.index > 0 ? destCards[destination.index - 1] : null;
    const nextIssue =
      destination.index < destCards.length ? destCards[destination.index] : null;

    // Optimistically update
    setIssues((prev) => {
      return prev.map((item) => {
        if (item._id === draggableId) {
          return {
            ...item,
            sprintId: destSprintId,
          };
        }
        return item;
      });
    });

    try {
      const res = await api.patch(`/v1/issues/${draggableId}/move`, {
        sprintId: destSprintId,
        prevIssueId: prevIssue?._id || null,
        nextIssueId: nextIssue?._id || null,
      });

      if (res.data.success && res.data.issue) {
        setIssues((prev) =>
          prev.map((i) => (i._id === draggableId ? res.data.issue : i))
        );
      }
    } catch (err) {
      console.error("Sprint move failed, reverting:", err);
      setIssues(previousIssuesSnapshot);
      toast.error("Failed to move issue. Reverted.");
    }
  };

  // Quick Create Issue
  const handleQuickCreateIssue = async (title, targetSprintId) => {
    try {
      const res = await api.post("/v1/issues", {
        projectId: currentProject._id,
        title,
        sprintId: targetSprintId || null,
        type: "Task",
        status: "To Do",
      });

      if (res.data.success) {
        toast.success(`Created ${res.data.issue.key}`);
        setIssues((prev) => [...prev, res.data.issue]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create issue");
    }
  };

  // Delete Issue
  const handleDeleteIssue = async (issueId) => {
    if (!confirm("Are you sure you want to delete this issue?")) return;
    try {
      const res = await api.delete(`/v1/issues/${issueId}`);
      if (res.data.success) {
        toast.success("Issue deleted");
        setIssues((prev) => prev.filter((i) => i._id !== issueId));
      }
    } catch {
      toast.error("Failed to delete issue");
    }
  };

  // Direct move to sprint from action menu
  const handleMoveToSprint = async (issueId, targetSprintId) => {
    try {
      const res = await api.patch(`/v1/issues/${issueId}`, {
        sprintId: targetSprintId || null,
      });
      if (res.data.success) {
        toast.success("Issue moved");
        setIssues((prev) =>
          prev.map((i) => (i._id === issueId ? { ...i, sprintId: targetSprintId } : i))
        );
      }
    } catch {
      toast.error("Failed to move issue");
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
  };

  const hasActiveFilters =
    search.trim() ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all";

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">No Project Selected</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mb-4">
            Select a project in the navigation bar to manage its backlog and sprints.
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
              {currentProject.name} Backlog & Sprints
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Plan sprints, track committed story points, and prioritize your product backlog
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          {!isGuest ? (
            <>
              {isManager && (
                <button
                  onClick={() => setIsCreateSprintOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Create Sprint</span>
                </button>
              )}

              <button
                onClick={() => setIsCreateIssueOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Issue</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center space-x-1.5">
              <span>👁️ Read-Only Backlog</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Filter backlog issues by key or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
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
          {(currentProject.members || []).map((m) => (
            <option
              key={m.userId?._id || m.userId}
              value={m.userId?._id || m.userId}
            >
              {m.userId?.name || m.userId?.email || "Member"}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Drag & Drop Work Area */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">
          Loading backlog and sprint data...
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-5">
            {/* Active Sprint Section */}
            {activeSprint && (
              <SprintGroup
                sprint={activeSprint}
                issues={getIssuesForContainer(activeSprint._id)}
                availableSprints={sprints}
                isGuest={isGuest}
                onCompleteSprint={(s) => setCompleteSprintTarget(s)}
                onEditSprint={(s) => setEditSprintTarget(s)}
                onDeleteSprint={(s) => setEditSprintTarget(s)}
                onDeleteIssue={handleDeleteIssue}
                onMoveToSprint={handleMoveToSprint}
                onQuickCreateIssue={handleQuickCreateIssue}
              />
            )}

            {/* Planned Sprints Section */}
            {plannedSprints.map((sprint) => (
              <SprintGroup
                key={sprint._id}
                sprint={sprint}
                issues={getIssuesForContainer(sprint._id)}
                availableSprints={sprints}
                isGuest={isGuest}
                onStartSprint={(s) => setStartSprintTarget(s)}
                onEditSprint={(s) => setEditSprintTarget(s)}
                onDeleteSprint={(s) => setEditSprintTarget(s)}
                onDeleteIssue={handleDeleteIssue}
                onMoveToSprint={handleMoveToSprint}
                onQuickCreateIssue={handleQuickCreateIssue}
              />
            ))}

            {/* Backlog Section */}
            <SprintGroup
              sprint={null}
              issues={getIssuesForContainer(null)}
              availableSprints={sprints}
              isGuest={isGuest}
              onDeleteIssue={handleDeleteIssue}
              onMoveToSprint={handleMoveToSprint}
              onQuickCreateIssue={handleQuickCreateIssue}
            />
          </div>
        </DragDropContext>
      )}

      {/* Modals */}
      <CreateSprintModal
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        project={currentProject}
        sprintCount={sprints.length}
        onSprintCreated={(newSprint) => {
          setSprints((prev) => [newSprint, ...prev]);
        }}
      />

      <StartSprintModal
        isOpen={!!startSprintTarget}
        onClose={() => setStartSprintTarget(null)}
        sprint={startSprintTarget}
        issues={issues}
        onSprintStarted={(updatedSprint) => {
          setSprints((prev) =>
            prev.map((s) => (s._id === updatedSprint._id ? updatedSprint : s))
          );
        }}
      />

      <CompleteSprintModal
        isOpen={!!completeSprintTarget}
        onClose={() => setCompleteSprintTarget(null)}
        sprint={completeSprintTarget}
        issues={issues}
        plannedSprints={plannedSprints}
        onSprintCompleted={() => {
          fetchData();
        }}
      />

      <EditSprintModal
        isOpen={!!editSprintTarget}
        onClose={() => setEditSprintTarget(null)}
        sprint={editSprintTarget}
        onSprintUpdated={(updatedSprint) => {
          setSprints((prev) =>
            prev.map((s) => (s._id === updatedSprint._id ? updatedSprint : s))
          );
        }}
        onSprintDeleted={(deletedId) => {
          setSprints((prev) => prev.filter((s) => s._id !== deletedId));
          fetchData();
        }}
      />
    </div>
  );
};

export default Backlog;
