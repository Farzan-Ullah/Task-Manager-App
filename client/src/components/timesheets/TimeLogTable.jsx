import React from "react";
import { Clock, Trash2, Calendar, FileText, ExternalLink } from "lucide-react";
import moment from "moment";
import { useApp } from "../../context/AppContext";

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const TimeLogTable = ({ timeLogs = [], onDeleteLog, loading = false }) => {
  const { user } = useApp();

  const handleIssueClick = (issueId) => {
    const targetId = typeof issueId === "object" ? (issueId?._id || issueId?.id) : issueId;
    if (targetId && targetId !== "[object Object]") {
      window.dispatchEvent(
        new CustomEvent("open-issue-detail", { detail: { issueId: targetId } })
      );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-gray-400">
        Loading timesheet logs...
      </div>
    );
  }

  if (timeLogs.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
          <Clock className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">No time logs recorded</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
          Use the timer widget or click "Log Time" to record your work hours.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Issue</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Work Description</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {timeLogs.map((log) => {
              const isOwner =
                user?.userId === log.userId?._id || user?.userId === log.userId;
              const issueId = log.issueId?._id || log.issueId;

              return (
                <tr
                  key={log._id}
                  className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3 px-4 font-medium text-gray-600 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                      <span>{moment(log.date).format("MMM D, YYYY")}</span>
                    </div>
                  </td>

                  {/* Member */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                        {(log.userId?.name || log.userId?.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">
                        {log.userId?.name || log.userId?.email || "User"}
                      </span>
                    </div>
                  </td>

                  {/* Issue */}
                  <td className="py-3 px-4">
                    {log.issueId ? (
                      <button
                        onClick={() => handleIssueClick(issueId)}
                        className="flex items-center space-x-1.5 text-left group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors max-w-xs truncate"
                      >
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                          {log.issueId.key}
                        </span>
                        <span className="truncate text-gray-900 dark:text-slate-100 font-medium">
                          {log.issueId.title}
                        </span>
                      </button>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 italic">General Project Work</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      {formatDuration(log.minutes)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="py-3 px-4 max-w-sm">
                    <p className="truncate text-gray-600 dark:text-slate-400">
                      {log.note || <span className="text-gray-300 dark:text-slate-600 italic">No notes</span>}
                    </p>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {isOwner && (
                      <button
                        onClick={() => onDeleteLog && onDeleteLog(log._id)}
                        className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeLogTable;
