import React from "react";
import { BarChart3, Users, Clock } from "lucide-react";
import moment from "moment";

const TimesheetAnalyticsSection = ({ byDate = [], byUser = [], totalMinutes = 0, isManager = true }) => {
  // Find max daily minutes for bar scale
  const maxDayMinutes = Math.max(...byDate.map((d) => d.totalMinutes), 60);

  return (
    <div className={`grid grid-cols-1 ${isManager ? "lg:grid-cols-2" : ""} gap-4`}>
      {/* Daily Workload Distribution */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                {isManager ? "Daily Work Distribution" : "My Daily Work Distribution"}
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
              {byDate.length} active day{byDate.length !== 1 ? "s" : ""}
            </span>
          </div>

          {byDate.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
              No daily logged data for selected period
            </div>
          ) : (
            <div className="h-44 flex items-end space-x-2 pt-6 pb-2 px-1 overflow-x-auto">
              {byDate.map((day) => {
                const heightPct = Math.max(8, Math.round((day.totalMinutes / maxDayMinutes) * 100));
                const hours = (day.totalMinutes / 60).toFixed(1);

                return (
                  <div
                    key={day._id}
                    className="flex-1 min-w-[36px] flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded-lg bg-gray-900 dark:bg-slate-800 text-white dark:text-slate-200 text-[10px] font-mono pointer-events-none whitespace-nowrap z-20 shadow-md border border-transparent dark:border-slate-700">
                      {hours}h ({day.entriesCount} logs)
                    </div>

                    {/* Bar */}
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* Day label */}
                    <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 mt-2 truncate w-full text-center">
                      {moment(day._id).format("D/M")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Team Member Workload Breakdown - Visible only to Managers */}
      {isManager && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                Team Member Contributions
              </h3>
            </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
            {byUser.length} contributor{byUser.length !== 1 ? "s" : ""}
          </span>
        </div>

        {byUser.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
            No contributor activity in this period
          </div>
        ) : (
          <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
            {byUser.map((user) => {
              const pct = totalMinutes > 0 ? Math.round((user.totalMinutes / totalMinutes) * 100) : 0;
              return (
                <div key={user.userId} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {(user.name || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-800 dark:text-slate-200 font-semibold">{user.name || user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-gray-900 dark:text-slate-100 font-bold">{user.totalHours}h</span>
                      <span className="text-[11px] text-gray-400 dark:text-slate-500">({pct}%)</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default TimesheetAnalyticsSection;
