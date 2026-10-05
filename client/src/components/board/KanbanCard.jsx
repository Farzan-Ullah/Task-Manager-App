import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  CheckSquare,
  Bug,
  Bookmark,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  Copy,
  Trash2,
  Edit,
  GitPullRequest,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { useApp } from "../../context/AppContext";

const KanbanCard = ({ issue, index, onDelete, onEdit, onSelect }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { startTimer, user, currentWorkspace, currentProject, workspaceMembers = [] } = useApp();

  const isManager = React.useMemo(() => {
    if (!user) return false;
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
    Task: <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
    Bug: <Bug className="w-3.5 h-3.5 text-red-500" />,
    Story: <Bookmark className="w-3.5 h-3.5 text-emerald-500" />,
    Issue: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    Request: <HelpCircle className="w-3.5 h-3.5 text-purple-500" />,
  };

  const priorityColors = {
    Highest: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-amber-500",
    Low: "bg-blue-500",
    Lowest: "bg-gray-400",
  };

  const isOverdue =
    issue.dueDate &&
    issue.status !== "Done" &&
    moment(issue.dueDate).isBefore(moment(), "day");

  const completedSubtasks = (issue.tasks || []).filter((t) => t.completed).length;
  const totalSubtasks = (issue.tasks || []).length;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/share/${issue._id}`);
    toast.success(`Share link for ${issue.key} copied!`);
    setShowMenu(false);
  };

  return (
    <Draggable draggableId={issue._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect && onSelect(issue)}
          className={`group relative bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border transition-all cursor-pointer ${
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-indigo-500/50 border-indigo-300 dark:border-indigo-500 scale-102 rotate-1"
              : "border-gray-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600"
          }`}
        >
          {/* Top row: Type icon + Key + Priority + Menu */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              {typeIcons[issue.type] || typeIcons.Task}
              <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {issue.key}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  priorityColors[issue.priority] || "bg-amber-500"
                }`}
                title={`Priority: ${issue.priority}`}
              />

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-opacity"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-30 py-1 text-xs">
                    <button
                      onClick={() => {
                        onEdit && onEdit(issue);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-1.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <Edit className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      {isManager ? "Edit Issue" : "View Details"}
                    </button>
                    <button
                      onClick={() => {
                        startTimer(issue);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-1.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <Clock className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                      Start Timer
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center px-3 py-1.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <Copy className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      Copy Link
                    </button>
                    {isManager && (
                      <button
                        onClick={() => {
                          onDelete && onDelete(issue._id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2 text-red-400" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 leading-snug line-clamp-2 mb-3">
            {issue.title}
          </h4>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {issue.labels.slice(0, 3).map((l, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                >
                  {l}
                </span>
              ))}
              {issue.labels.length > 3 && (
                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                  +{issue.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Subtask checklist progress */}
          {totalSubtasks > 0 && (
            <div className="flex items-center space-x-2 mb-3 bg-gray-50/80 dark:bg-slate-700/40 px-2 py-1 rounded-lg">
              <CheckCircle2 className="w-3 h-3 text-indigo-500" />
              <div className="flex-1 bg-gray-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono">
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}

          {/* Footer: Due date + Story Points + Assignee Avatar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/80 text-[11px] text-gray-500 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              {issue.dueDate && (
                <span
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded font-medium ${
                    isOverdue
                      ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                      : "bg-gray-50 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{moment(issue.dueDate).format("MMM D")}</span>
                </span>
              )}

              {issue.estimate > 0 && (
                <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                  {issue.estimate} pts
                </span>
              )}

              {issue.pullRequests && issue.pullRequests.length > 0 && (
                <span
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                  title={`${issue.pullRequests.length} Pull Request(s) linked`}
                >
                  <GitPullRequest className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>{issue.pullRequests.length} PR</span>
                </span>
              )}
            </div>

            {/* Assignee Avatar */}
            <div>
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
                  className="w-5 h-5 rounded-full border border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-gray-400 dark:text-slate-500"
                  title="Unassigned"
                >
                  -
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
