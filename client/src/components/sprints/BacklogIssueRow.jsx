import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  CheckSquare,
  Bug,
  Bookmark,
  MoreVertical,
  Clock,
  Trash2,
  CornerDownRight,
  GitPullRequest,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";

const BacklogIssueRow = ({
  issue,
  index,
  onDelete,
  onMoveToSprint,
  availableSprints = [],
}) => {
  const { user, currentWorkspace, currentProject, workspaceMembers = [], isGuest } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const isManager = React.useMemo(() => {
    if (!user || isGuest) return false;
    const uid = (user.userId || user._id)?.toString();
    if (!uid) return false;
    if (user.role === "Admin" || user.role === "admin") return true;

    if (currentWorkspace) {
      const ownerId = (currentWorkspace.owner?._id || currentWorkspace.owner)?.toString();
      if (ownerId && ownerId === uid) return true;
    }
    const wkspMember = workspaceMembers.find((m) => {
      const mId = (m.userId?._id || m.userId || m._id)?.toString();
      return mId === uid;
    });
    if (
      wkspMember &&
      (wkspMember.role === "Workspace Admin" ||
        wkspMember.role === "Project Manager" ||
        wkspMember.role === "Admin")
    ) {
      return true;
    }

    if (currentProject) {
      const leadId = (currentProject.leadId?._id || currentProject.leadId)?.toString();
      if (leadId && leadId === uid) return true;

      const projMembers = currentProject.members || [];
      const projMember = projMembers.find((m) => {
        const mId = (m.userId?._id || m.userId || m._id)?.toString();
        return mId === uid;
      });
      if (
        projMember &&
        (projMember.role === "Project Manager" ||
          projMember.role === "Workspace Admin" ||
          projMember.role === "Admin")
      ) {
        return true;
      }
    }

    return false;
  }, [user, currentWorkspace, workspaceMembers, currentProject]);

  const typeIcons = {
    Task: <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
    Bug: <Bug className="w-3.5 h-3.5 text-red-500 shrink-0" />,
    Story: <Bookmark className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
    Issue: <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
    Request: <HelpCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
  };

  const priorityColors = {
    Highest: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-amber-500",
    Low: "bg-blue-500",
    Lowest: "bg-gray-400",
  };

  const statusColors = {
    Backlog: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700",
    "To Do": "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    "In Progress": "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    Review: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    Testing: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    Done: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  };

  const handleRowClick = () => {
    const targetId = typeof issue === "object" ? (issue?._id || issue?.id) : issue;
    if (targetId && targetId !== "[object Object]") {
      window.dispatchEvent(
        new CustomEvent("open-issue-detail", { detail: { issueId: targetId } })
      );
    }
  };

  return (
    <Draggable draggableId={issue._id} index={index} isDragDisabled={isGuest}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={handleRowClick}
          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
            snapshot.isDragging
              ? "bg-white dark:bg-slate-800 shadow-xl ring-2 ring-indigo-500/50 border-indigo-300 dark:border-indigo-500 scale-101 z-30"
              : "bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-850 border-gray-200/80 dark:border-slate-800 shadow-2xs hover:border-gray-300 dark:hover:border-slate-700"
          }`}
        >
          {/* Left section: drag handle + type + key + title */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
            {!isGuest && (
              <div
                {...provided.dragHandleProps}
                className="text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}

            {typeIcons[issue.type] || typeIcons.Task}

            <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
              {issue.key}
            </span>

            <span
              className={`truncate font-medium ${
                issue.status === "Done"
                  ? "text-gray-400 dark:text-slate-500 line-through"
                  : "text-gray-900 dark:text-slate-100"
              }`}
            >
              {issue.title}
            </span>
          </div>

          {/* Right section: status + priority + story points + assignee + menu */}
          <div
            className="flex items-center space-x-2.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* PRs Pill */}
            {issue.pullRequests && issue.pullRequests.length > 0 && (
              <span
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                title={`${issue.pullRequests.length} Pull Request(s) linked`}
              >
                <GitPullRequest className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>{issue.pullRequests.length} PR</span>
              </span>
            )}

            {/* Status Pill */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                statusColors[issue.status] || "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {issue.status}
            </span>

            {/* Priority Dot */}
            <span
              className={`w-2 h-2 rounded-full ${
                priorityColors[issue.priority] || "bg-gray-400"
              }`}
              title={`Priority: ${issue.priority}`}
            />

            {/* Story Points */}
            <span
              className={`min-w-6 text-center px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                issue.estimate > 0
                  ? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700"
                  : "text-gray-300 dark:text-slate-600"
              }`}
            >
              {issue.estimate || "-"}
            </span>

            {/* Assignee Avatar */}
            <div className="w-5 h-5">
              {issue.assigneeId ? (
                <div
                  className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs"
                  title={issue.assigneeId.name || issue.assigneeId.email}
                >
                  {(issue.assigneeId.name || issue.assigneeId.email)
                    .charAt(0)
                    .toUpperCase()}
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-gray-300 dark:text-slate-600"
                  title="Unassigned"
                >
                  -
                </div>
              )}
            </div>

            {/* Action Menu */}
            {!isGuest && (
              <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  {/* Move to another sprint or backlog: Manager only */}
                  {isManager && availableSprints.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1 py-1">
                      <div className="px-3 py-0.5 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase">
                        Move to:
                      </div>
                      {issue.sprintId && (
                        <button
                          onClick={() => {
                            onMoveToSprint && onMoveToSprint(issue._id, null);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center px-3 py-1 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 text-[11px]"
                        >
                          <CornerDownRight className="w-3 h-3 mr-1.5 text-gray-400" />
                          Backlog
                        </button>
                      )}
                      {availableSprints
                        .filter((s) => s._id !== (issue.sprintId?._id || issue.sprintId))
                        .map((s) => (
                          <button
                            key={s._id}
                            onClick={() => {
                              onMoveToSprint && onMoveToSprint(issue._id, s._id);
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center px-3 py-1 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 text-[11px] truncate"
                          >
                            <CornerDownRight className="w-3 h-3 mr-1.5 text-indigo-400" />
                            <span className="truncate">{s.name}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Delete Issue: Manager only */}
                  {isManager && (
                    <>
                      <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                      <button
                        onClick={() => {
                          onDelete && onDelete(issue._id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2 text-red-400" />
                        Delete Issue
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default BacklogIssueRow;
