import React, { useState, useEffect } from "react";
import { X, Clock, Calendar, CheckSquare, FileText, Sparkles } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import api from "../../utils/api";

const LogTimeModal = ({ isOpen, onClose, currentProject, initialIssue = null, onTimeLogged }) => {
  const [issues, setIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && currentProject?._id) {
      api.get(`/v1/issues?projectId=${currentProject._id}&limit=100`).then((res) => {
        if (res.data.success) {
          setIssues(res.data.issues || []);
          if (initialIssue?._id) {
            setSelectedIssueId(initialIssue._id);
          } else if (res.data.issues?.length > 0 && !selectedIssueId) {
            setSelectedIssueId(res.data.issues[0]._id);
          }
        }
      });
      setDate(moment().format("YYYY-MM-DD"));
      setHours(1);
      setMinutes(0);
      setNote("");
    }
  }, [isOpen, currentProject?._id, initialIssue]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalMinutes = Number(hours) * 60 + Number(minutes);

    if (totalMinutes <= 0) {
      toast.error("Please enter a positive duration");
      return;
    }

    if (!selectedIssueId) {
      toast.error("Please select an issue to log time for");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/v1/time-logs", {
        issueId: selectedIssueId,
        minutes: totalMinutes,
        date: new Date(date),
        note: note.trim(),
      });

      if (res.data.success) {
        toast.success(`Logged ${(totalMinutes / 60).toFixed(1)}h of work!`);
        onTimeLogged && onTimeLogged(res.data.timeLog);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log time");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(
    (i) =>
      (i.key || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/40 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Log Work Time</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Record time spent on project issues</p>
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
          {/* Issue Selector */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Select Issue <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Search issues by key or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
              <select
                required
                value={selectedIssueId}
                onChange={(e) => setSelectedIssueId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {filteredIssues.map((iss) => (
                  <option key={iss._id} value={iss._id}>
                    {iss.key} — {iss.title} ({iss.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                Work Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
                Time Spent <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400 dark:text-slate-500">
                    hrs
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400 dark:text-slate-500">
                    mins
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">Quick Presets:</span>
            {[
              { label: "30m", h: 0, m: 30 },
              { label: "1h", h: 1, m: 0 },
              { label: "2h", h: 2, m: 0 },
              { label: "4h", h: 4, m: 0 },
              { label: "8h", h: 8, m: 0 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setHours(preset.h);
                  setMinutes(preset.m);
                }}
                className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-[10px] font-semibold transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Work Description / Note */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Work Description (Optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Summary of accomplishments, tasks done, or findings..."
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
              disabled={loading || !selectedIssueId}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Logging..." : "Log Time"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogTimeModal;
