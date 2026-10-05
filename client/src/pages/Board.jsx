import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useApp } from "../context/AppContext";
import KanbanColumn from "../components/board/KanbanColumn";
import BoardFilterBar from "../components/board/BoardFilterBar";
import ColumnConfigModal from "../components/board/ColumnConfigModal";
import { getSocket } from "../utils/socket";
import api from "../utils/api";
import { toast } from "sonner";
import { Plus, Kanban } from "lucide-react";

const Board = () => {
  const { currentProject, currentWorkspace, setIsCreateIssueOpen } = useApp();

  const [board, setBoard] = useState(null);
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    sprintId: "all",
    assigneeId: "all",
    priority: "all",
    type: "all",
    search: "",
  });

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Fetch Board Configuration & Issues
  const fetchBoardData = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sprintQuery = filters.sprintId !== "all" ? `?sprintId=${filters.sprintId}` : "";
      const [boardRes, sprintsRes] = await Promise.all([
        api.get(`/v1/projects/${currentProject._id}/board${sprintQuery}`),
        api.get(`/v1/sprints?projectId=${currentProject._id}`),
      ]);

      if (boardRes.data.success) {
        setBoard(boardRes.data.board);
        setIssues(boardRes.data.issues || []);
      }

      if (sprintsRes.data.success) {
        setSprints(sprintsRes.data.sprints || []);
      }
    } catch (err) {
      console.error("Failed to fetch board data:", err);
      toast.error("Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id, filters.sprintId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!currentProject?._id) return;

    const socket = getSocket();

    const handleIssueCreated = (newIssue) => {
      if (newIssue.projectId === currentProject._id) {
        setIssues((prev) => {
          if (prev.some((i) => i._id === newIssue._id)) return prev;
          return [...prev, newIssue];
        });
      }
    };

    const handleIssueMoved = (movedIssue) => {
      if (movedIssue.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === movedIssue._id ? { ...i, ...movedIssue } : i))
        );
      }
    };

    const handleIssueUpdated = (updatedIssue) => {
      if (updatedIssue.projectId === currentProject._id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === updatedIssue._id ? { ...i, ...updatedIssue } : i))
        );
      }
    };

    const handleIssueDeleted = ({ issueId }) => {
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
    };

    const handleBoardColumnsUpdated = (updatedBoard) => {
      setBoard(updatedBoard);
    };

    socket.on("issue.created", handleIssueCreated);
    socket.on("issue.moved", handleIssueMoved);
    socket.on("issue.updated", handleIssueUpdated);
    socket.on("issue.deleted", handleIssueDeleted);
    socket.on("board.columns.updated", handleBoardColumnsUpdated);

    // Global custom event listener from Create modal
    const handleGlobalCreate = (e) => {
      if (e.detail?.projectId === currentProject._id) {
        handleIssueCreated(e.detail);
      }
    };
    window.addEventListener("issue-created-global", handleGlobalCreate);

    return () => {
      socket.off("issue.created", handleIssueCreated);
      socket.off("issue.moved", handleIssueMoved);
      socket.off("issue.updated", handleIssueUpdated);
      socket.off("issue.deleted", handleIssueDeleted);
      socket.off("board.columns.updated", handleBoardColumnsUpdated);
      window.removeEventListener("issue-created-global", handleGlobalCreate);
    };
  }, [currentProject?._id]);

  // Filter Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (filters.assigneeId === "unassigned" && iss.assigneeId) return false;
      if (
        filters.assigneeId !== "all" &&
        filters.assigneeId !== "unassigned" &&
        iss.assigneeId?._id !== filters.assigneeId &&
        iss.assigneeId !== filters.assigneeId
      ) {
        return false;
      }
      if (filters.priority !== "all" && iss.priority !== filters.priority) return false;
      if (filters.type !== "all" && iss.type !== filters.type) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesKey = (iss.key || "").toLowerCase().includes(query);
        const matchesTitle = (iss.title || "").toLowerCase().includes(query);
        if (!matchesKey && !matchesTitle) return false;
      }
      return true;
    });
  }, [issues, filters]);

  // Group Issues by Column Status Map
  const issuesByColumn = useMemo(() => {
    const map = {};
    if (!board?.columns) return map;

    board.columns.forEach((col) => {
      const statusKey = col.statusMap || col.name;
      map[statusKey] = filteredIssues
        .filter((i) => (i.status || "To Do").toLowerCase() === statusKey.toLowerCase())
        .sort((a, b) => (a.rank < b.rank ? -1 : 1));
    });

    return map;
  }, [board, filteredIssues]);

  // Drag and Drop End Handler with Optimistic UI & Rollback
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Snapshot previous issues for rollback on failure
    const previousIssuesSnapshot = [...issues];

    // Find dragged issue
    const draggedIssue = issues.find((i) => i._id === draggableId);
    if (!draggedIssue) return;

    // Get ordered cards in destination column
    const currentDestCards = [...(issuesByColumn[destStatus] || [])].filter(
      (i) => i._id !== draggableId
    );

    // Compute previous and next issue IDs for LexoRank calculation
    const prevIssue = destination.index > 0 ? currentDestCards[destination.index - 1] : null;
    const nextIssue =
      destination.index < currentDestCards.length
        ? currentDestCards[destination.index]
        : null;

    // Optimistically update local state immediately
    setIssues((prev) => {
      return prev.map((item) => {
        if (item._id === draggableId) {
          return {
            ...item,
            status: destStatus,
          };
        }
        return item;
      });
    });

    // Synchronize with server
    try {
      const res = await api.patch(`/v1/issues/${draggableId}/move`, {
        status: destStatus,
        prevIssueId: prevIssue?._id || null,
        nextIssueId: nextIssue?._id || null,
      });

      if (res.data.success && res.data.issue) {
        // Update local issue with verified server rank
        setIssues((prev) =>
          prev.map((i) => (i._id === draggableId ? res.data.issue : i))
        );
      }
    } catch (err) {
      console.error("Move sync failed, reverting optimistic UI:", err);
      // Revert state
      setIssues(previousIssuesSnapshot);
      toast.error("Failed to move issue. Reverted.");
    }
  };

  // Issue Action Handlers
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

  const handleSelectIssue = (issue) => {
    const targetId = typeof issue === "object" ? (issue?._id || issue?.id) : issue;
    if (targetId && targetId !== "[object Object]") {
      window.dispatchEvent(new CustomEvent("open-issue-detail", { detail: { issueId: targetId } }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      sprintId: "all",
      assigneeId: "all",
      priority: "all",
      type: "all",
      search: "",
    });
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Kanban className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Project Selected</h2>
          <p className="text-xs text-gray-500 max-w-xs mb-4">
            Select an existing project or create a new project in the top navigation to view the board.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject.name} Board
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {currentProject.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""} across {board?.columns?.length || 0} columns
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateIssueOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <BoardFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        members={currentProject.members || []}
        sprints={sprints}
        onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
      />

      {/* Drag and Drop Canvas */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          Loading Kanban Board...
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
            <div className="flex space-x-4 min-w-max h-full">
              {board?.columns?.map((col) => {
                const statusKey = col.statusMap || col.name;
                const columnIssues = issuesByColumn[statusKey] || [];

                return (
                  <KanbanColumn
                    key={col.id || col.name}
                    column={col}
                    issues={columnIssues}
                    onAddIssue={(status) => {
                      setIsCreateIssueOpen(true);
                    }}
                    onDeleteIssue={handleDeleteIssue}
                    onEditIssue={handleSelectIssue}
                    onSelectIssue={handleSelectIssue}
                  />
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Column & WIP Configuration Modal */}
      {board && (
        <ColumnConfigModal
          isOpen={isColumnConfigOpen}
          onClose={() => setIsColumnConfigOpen(false)}
          board={board}
          onColumnsUpdated={(updatedBoard) => setBoard(updatedBoard)}
        />
      )}
    </div>
  );
};

export default Board;
