import React, { useState } from "react";
import { CheckSquare, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const SubtasksManager = ({ parentIssue, subtasks = [], onSubtasksChanged, isGuest = false }) => {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const completedCount = subtasks.filter((s) => s.status === "Done").length;
  const totalCount = subtasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    if (isGuest || !newTitle.trim() || !parentIssue?._id) return;

    setAdding(true);
    try {
      const res = await api.post("/v1/issues", {
        projectId: parentIssue.projectId,
        title: newTitle.trim(),
        parentId: parentIssue._id,
        type: "Task",
        priority: parentIssue.priority || "Medium",
        status: "To Do",
      });

      if (res.data.success) {
        toast.success(`Subtask ${res.data.issue.key} created`);
        setNewTitle("");
        onSubtasksChanged && onSubtasksChanged();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create subtask");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    if (isGuest) return;
    const nextStatus = subtask.status === "Done" ? "To Do" : "Done";
    try {
      await api.patch(`/v1/issues/${subtask._id}`, { status: nextStatus });
      onSubtasksChanged && onSubtasksChanged();
    } catch (err) {
      toast.error("Failed to update subtask");
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (isGuest) return;
    try {
      await api.delete(`/v1/issues/${subtaskId}`);
      toast.success("Subtask deleted");
      onSubtasksChanged && onSubtasksChanged();
    } catch (err) {
      toast.error("Failed to delete subtask");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            Subtasks
          </h4>
          {totalCount > 0 && (
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>

        {totalCount > 0 && (
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {percentage}% completed
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-1.5">
        {subtasks.map((st) => {
          const isDone = st.status === "Done";
          return (
            <div
              key={st._id}
              className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 hover:bg-gray-100/70 dark:hover:bg-slate-800 border border-gray-200/60 dark:border-slate-700/60 transition-colors group"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isDone}
                  disabled={isGuest}
                  onChange={() => handleToggleSubtask(st)}
                  className={`w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500 ${
                    isGuest ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                />
                <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                  {st.key}
                </span>
                <span
                  className={`text-xs truncate ${
                    isDone ? "text-gray-400 dark:text-slate-500 line-through" : "text-gray-800 dark:text-slate-200 font-medium"
                  }`}
                >
                  {st.title}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {st.assigneeId && (
                  <div
                    className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-900/40"
                    title={st.assigneeId.name || st.assigneeId.email}
                  >
                    {(st.assigneeId.name || st.assigneeId.email).charAt(0).toUpperCase()}
                  </div>
                )}
                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {subtasks.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500 italic">No subtasks for this task.</p>
        )}
      </div>

      {/* Inline Subtask Creation - Hidden for Guests */}
      {!isGuest && (
        <form onSubmit={handleCreateSubtask} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="Add a subtask and press Enter..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl disabled:opacity-40 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default SubtasksManager;
