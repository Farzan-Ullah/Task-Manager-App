import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Play, Pause, Square, Clock, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

function formatSeconds(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

const TimerWidget = () => {
  const { timer, startTimer, pauseTimer, resetTimer, currentProject } = useApp();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [issueKeyInput, setIssueKeyInput] = useState("");

  const handleStop = () => {
    pauseTimer();
    setIssueKeyInput(timer.issueKey || "");
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    const minutes = Math.max(1, Math.round(timer.seconds / 60));

    if (!timer.issueId && !issueKeyInput.trim()) {
      toast.error("Please enter an issue key to log time");
      return;
    }

    try {
      let targetIssueId = timer.issueId;

      if (!targetIssueId && issueKeyInput.trim()) {
        const issueRes = await api.get(`/v1/issues/${issueKeyInput.trim()}`);
        if (issueRes.data.success && issueRes.data.issue) {
          targetIssueId = issueRes.data.issue._id;
        } else {
          toast.error("Issue not found");
          return;
        }
      }

      await api.post("/v1/time-logs", {
        issueId: targetIssueId,
        minutes,
        note: logNote.trim(),
      });

      toast.success(`Logged ${minutes} minutes of work!`);
      resetTimer();
      setLogNote("");
      setIsLogModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log time");
    }
  };

  return (
    <>
      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-gray-100/90 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors">
        <div className="flex items-center space-x-1.5 mr-1">
          {timer.active ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          ) : (
            <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
          )}
          <span className="font-mono text-xs font-semibold tracking-wider text-gray-900 dark:text-white">
            {formatSeconds(timer.seconds)}
          </span>
        </div>

        {timer.active ? (
          <button
            onClick={pauseTimer}
            title="Pause Timer"
            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => startTimer()}
            title="Start Timer"
            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
          </button>
        )}

        {timer.seconds > 0 && (
          <button
            onClick={handleStop}
            title="Stop & Log Time"
            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/50 rounded text-red-600 dark:text-red-400 hover:text-red-800 transition-colors"
          >
            <Square className="w-3 h-3 fill-red-600 dark:fill-red-400" />
          </button>
        )}
      </div>

      {/* Log Time Confirmation Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-transparent dark:border-slate-800 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Log Tracked Time</h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-xl mb-4 text-center border border-indigo-100/50 dark:border-indigo-900/40">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Tracked Duration</p>
              <p className="text-2xl font-mono font-extrabold text-indigo-900 dark:text-indigo-200">
                {formatSeconds(timer.seconds)}
              </p>
              <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
                (~{Math.max(1, Math.round(timer.seconds / 60))} minutes)
              </p>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Issue Key or ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PROJ-101"
                  value={issueKeyInput}
                  onChange={(e) => setIssueKeyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Work Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="What did you work on?"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetTimer();
                    setIsLogModalOpen(false);
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  Discard Time
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs"
                >
                  Save Time Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TimerWidget;
