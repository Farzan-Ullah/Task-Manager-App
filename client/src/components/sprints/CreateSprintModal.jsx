import React, { useState, useEffect } from "react";
import { X, Calendar, Flag, Sparkles } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import api from "../../utils/api";

const CreateSprintModal = ({ isOpen, onClose, project, onSprintCreated, sprintCount = 0 }) => {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("2 weeks");
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().add(14, "days").format("YYYY-MM-DD"));
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultName = `${project?.key || "Sprint"} Sprint ${sprintCount + 1}`;
      setName(defaultName);
      setDuration("2 weeks");
      const start = moment().format("YYYY-MM-DD");
      setStartDate(start);
      setEndDate(moment().add(14, "days").format("YYYY-MM-DD"));
      setGoal("");
    }
  }, [isOpen, project?.key, sprintCount]);

  const handleDurationChange = (dur) => {
    setDuration(dur);
    const start = moment(startDate);
    if (dur === "1 week") {
      setEndDate(start.add(7, "days").format("YYYY-MM-DD"));
    } else if (dur === "2 weeks") {
      setEndDate(start.add(14, "days").format("YYYY-MM-DD"));
    } else if (dur === "3 weeks") {
      setEndDate(start.add(21, "days").format("YYYY-MM-DD"));
    } else if (dur === "4 weeks") {
      setEndDate(start.add(28, "days").format("YYYY-MM-DD"));
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    const start = moment(val);
    if (duration === "1 week") setEndDate(start.add(7, "days").format("YYYY-MM-DD"));
    else if (duration === "2 weeks") setEndDate(start.add(14, "days").format("YYYY-MM-DD"));
    else if (duration === "3 weeks") setEndDate(start.add(21, "days").format("YYYY-MM-DD"));
    else if (duration === "4 weeks") setEndDate(start.add(28, "days").format("YYYY-MM-DD"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !project?._id) return;

    setLoading(true);
    try {
      const res = await api.post("/v1/sprints", {
        projectId: project._id,
        name: name.trim(),
        goal: goal.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });

      if (res.data.success) {
        toast.success(`Sprint "${res.data.sprint.name}" created`);
        onSprintCreated && onSprintCreated(res.data.sprint);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create sprint");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Create Sprint</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Plan an iteration for {project?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Sprint Name */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PROJ Sprint 1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs font-semibold text-gray-800 dark:text-slate-100"
            />
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="1 week">1 week</option>
              <option value="2 weeks">2 weeks (Recommended)</option>
              <option value="3 weeks">3 weeks</option>
              <option value="4 weeks">4 weeks</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDuration("custom");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
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
              placeholder="What is the objective or value delivering in this sprint?"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
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
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Creating..." : "Create Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSprintModal;
