import React, { useState, useEffect } from "react";
import { X, Play, AlertCircle, Calendar } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import api from "../../utils/api";

const StartSprintModal = ({ isOpen, onClose, sprint, issues = [], onSprintStarted }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sprint) {
      setStartDate(
        sprint.startDate
          ? moment(sprint.startDate).format("YYYY-MM-DD")
          : moment().format("YYYY-MM-DD")
      );
      setEndDate(
        sprint.endDate
          ? moment(sprint.endDate).format("YYYY-MM-DD")
          : moment().add(14, "days").format("YYYY-MM-DD")
      );
      setGoal(sprint.goal || "");
    }
  }, [sprint]);

  if (!isOpen || !sprint) return null;

  const sprintIssues = issues.filter((i) => i.sprintId === sprint._id || i.sprintId?._id === sprint._id);
  const totalPoints = sprintIssues.reduce((acc, i) => acc + (i.estimate || 0), 0);

  const handleStart = async (e) => {
    e.preventDefault();
    if (moment(endDate).isSameOrBefore(moment(startDate))) {
      toast.error("End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      // If goal changed, update sprint first
      if (goal !== sprint.goal) {
        await api.patch(`/v1/sprints/${sprint._id}`, { goal: goal.trim() });
      }

      const res = await api.post(`/v1/sprints/${sprint._id}/start`, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      if (res.data.success) {
        toast.success(`Sprint "${sprint.name}" is now active!`);
        onSprintStarted && onSprintStarted(res.data.sprint);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start sprint");
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
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Play className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Start Sprint</h2>
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

        <form onSubmit={handleStart} className="p-6 space-y-4 text-xs">
          {/* Summary Box */}
          <div className="p-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200/70 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 dark:text-slate-100 text-xs">{sprint.name}</p>
              <p className="text-gray-500 dark:text-slate-400 text-[11px]">
                {sprintIssues.length} issue{sprintIssues.length !== 1 ? "s" : ""} committed
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
                {totalPoints}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 ml-1">story points</span>
            </div>
          </div>

          {sprintIssues.length === 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                This sprint has no issues. You can still start it, but it's recommended to drag issues into it first.
              </span>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Sprint Goal
            </label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do we want to accomplish in this sprint?"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-gray-100 dark:border-slate-800">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{loading ? "Starting..." : "Start Sprint"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartSprintModal;
