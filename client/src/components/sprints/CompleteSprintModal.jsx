import React, { useState } from "react";
import { X, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const CompleteSprintModal = ({ isOpen, onClose, sprint, issues = [], plannedSprints = [], onSprintCompleted }) => {
  const [rolloverTo, setRolloverTo] = useState("backlog"); // "backlog" | "next"
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !sprint) return null;

  const sprintIssues = issues.filter(
    (i) => i.sprintId === sprint._id || i.sprintId?._id === sprint._id
  );

  const completedIssues = sprintIssues.filter((i) => i.status === "Done");
  const incompleteIssues = sprintIssues.filter((i) => i.status !== "Done");

  const completedPoints = completedIssues.reduce((acc, i) => acc + (i.estimate || 0), 0);
  const incompletePoints = incompleteIssues.reduce((acc, i) => acc + (i.estimate || 0), 0);

  const otherPlannedSprints = plannedSprints.filter((s) => s._id !== sprint._id);

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post(`/v1/sprints/${sprint._id}/complete`, {
        rolloverTo: rolloverTo === "next" && selectedSprintId ? "next" : "backlog",
        nextSprintId: rolloverTo === "next" ? selectedSprintId : null,
      });

      if (res.data.success) {
        toast.success(res.data.message || `Sprint "${sprint.name}" completed!`);
        onSprintCompleted && onSprintCompleted(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete sprint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Complete Sprint</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">{sprint.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleComplete} className="p-6 space-y-4 text-xs">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
              <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </div>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200 font-mono">
                {completedIssues.length}{" "}
                <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">issues</span>
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {completedPoints} story points
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
              <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Incomplete</span>
              </div>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200 font-mono">
                {incompleteIssues.length}{" "}
                <span className="text-xs font-normal text-amber-700 dark:text-amber-400">issues</span>
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {incompletePoints} story points
              </p>
            </div>
          </div>

          {/* Rollover Section if there are incomplete issues */}
          {incompleteIssues.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Move {incompleteIssues.length} Incomplete Issue{incompleteIssues.length !== 1 ? "s" : ""} To:
              </label>

              <div className="space-y-2">
                <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="rollover"
                    value="backlog"
                    checked={rolloverTo === "backlog"}
                    onChange={() => setRolloverTo("backlog")}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 text-xs">Backlog</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Issues will return to the unassigned backlog queue for later prioritization
                    </p>
                  </div>
                </label>

                {otherPlannedSprints.length > 0 && (
                  <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="rollover"
                      value="next"
                      checked={rolloverTo === "next"}
                      onChange={() => {
                        setRolloverTo("next");
                        if (!selectedSprintId && otherPlannedSprints.length > 0) {
                          setSelectedSprintId(otherPlannedSprints[0]._id);
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 text-xs">A Planned Sprint</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
                        Move remaining tasks directly into another upcoming sprint
                      </p>

                      {rolloverTo === "next" && (
                        <select
                          value={selectedSprintId}
                          onChange={(e) => setSelectedSprintId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium text-xs outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          {otherPlannedSprints.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "Completing..." : "Complete Sprint"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteSprintModal;
