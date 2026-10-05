import React, { useState, useEffect } from "react";
import { X, Trash2, Edit3 } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import api from "../../utils/api";

const EditSprintModal = ({ isOpen, onClose, sprint, onSprintUpdated, onSprintDeleted }) => {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sprint) {
      setName(sprint.name || "");
      setGoal(sprint.goal || "");
      setStartDate(
        sprint.startDate ? moment(sprint.startDate).format("YYYY-MM-DD") : ""
      );
      setEndDate(
        sprint.endDate ? moment(sprint.endDate).format("YYYY-MM-DD") : ""
      );
    }
  }, [sprint]);

  if (!isOpen || !sprint) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await api.patch(`/v1/sprints/${sprint._id}`, {
        name: name.trim(),
        goal: goal.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });

      if (res.data.success) {
        toast.success("Sprint updated successfully");
        onSprintUpdated && onSprintUpdated(res.data.sprint);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update sprint");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${sprint.name}"? All assigned issues will be moved to the backlog.`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/v1/sprints/${sprint._id}`);
      if (res.data.success) {
        toast.success("Sprint deleted and issues moved to backlog");
        onSprintDeleted && onSprintDeleted(sprint._id);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete sprint");
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
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Edit Sprint</h2>
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

        <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs font-semibold text-gray-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Sprint Goal
            </label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the objective or deliverable for this sprint?"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Sprint</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSprintModal;
