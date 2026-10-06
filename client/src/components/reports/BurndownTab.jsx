import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Layers,
  Hash,
  Info,
  Clock,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import api from "../../utils/api";

const BurndownTab = ({ projectId, sprints = [] }) => {
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState("points"); // "points" | "issues"

  useEffect(() => {
    if (sprints.length > 0) {
      const exists = sprints.some((s) => s._id === selectedSprintId);
      if (!exists) {
        const active = sprints.find((s) => s.status === "ACTIVE");
        setSelectedSprintId(active ? active._id : sprints[0]._id);
      }
    } else {
      setSelectedSprintId("");
    }
  }, [sprints, selectedSprintId]);

  useEffect(() => {
    if (!selectedSprintId) return;
    setLoading(true);
    const url = `/v1/reports/burndown?sprintId=${selectedSprintId}${projectId ? `&projectId=${projectId}` : ""}`;
    api
      .get(url)
      .then((res) => {
        if (res.data.success) {
          setData(res.data);
          // Smart fallback: If no story points are estimated in this sprint, auto-switch to task count
          if (!res.data.metrics?.hasEstimates && res.data.metrics?.totalIssues > 0) {
            setUnit("issues");
          } else if (res.data.metrics?.hasEstimates) {
            setUnit("points");
          }
        }
      })
      .catch((err) => console.error("Burndown fetch error:", err))
      .finally(() => setLoading(false));
  }, [selectedSprintId, projectId]);

  if (sprints.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800">
        <Flame className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">No sprints created yet</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
          Create and start a sprint in the Backlog view to generate burndown charts.
        </p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalCommittedPoints: 0,
    completedPoints: 0,
    remainingPoints: 0,
    completionPercentage: 0,
    totalIssues: 0,
    completedIssues: 0,
    remainingIssues: 0,
    issueCompletionPercentage: 0,
    hasEstimates: false,
  };

  const isPointsMode = unit === "points";

  // Compute pace health based on current mode
  const timeline = data?.timeline || [];
  const lastActual = timeline
    .filter((t) => (isPointsMode ? t.actual !== null : t.actualIssues !== null))
    .pop();

  const isAhead = lastActual
    ? isPointsMode
      ? lastActual.actual <= lastActual.ideal
      : lastActual.actualIssues <= lastActual.idealIssues
    : true;

  // Active display values
  const committedVal = isPointsMode ? metrics.totalCommittedPoints : metrics.totalIssues;
  const completedVal = isPointsMode ? metrics.completedPoints : metrics.completedIssues;
  const remainingVal = isPointsMode ? metrics.remainingPoints : metrics.remainingIssues;
  const rateVal = isPointsMode ? metrics.completionPercentage : metrics.issueCompletionPercentage;
  const unitLabel = isPointsMode ? "pts" : "tasks";

  return (
    <div className="space-y-4">
      {/* Top Filter and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Sprint:
            </label>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Unit Toggle: Story Points vs Task Count */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-gray-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setUnit("points")}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                unit === "points"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Story Points (pts)</span>
            </button>
            <button
              type="button"
              onClick={() => setUnit("issues")}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                unit === "issues"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Task Count (tasks)</span>
            </button>
          </div>
        </div>

        {/* Pace Status */}
        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 ${
              isAhead
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
            }`}
          >
            {isAhead ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            <span>{isAhead ? "Pace: Ahead of Schedule" : "Pace: Behind Schedule"}</span>
          </span>
        </div>
      </div>

      {/* Contextual Warning / Guidance Banner */}
      {metrics.totalIssues === 0 ? (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">No tasks assigned to this sprint</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              The metrics and burndown line are empty because no issues are currently assigned to this sprint. Go to the <strong>Backlog</strong> view and drag issues into this sprint to see burndown analytics.
            </p>
          </div>
        </div>
      ) : !metrics.hasEstimates && unit === "points" ? (
        <div className="flex items-start justify-between gap-3 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl text-indigo-900 dark:text-indigo-200 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="font-semibold">Story points are unestimated (0 pts)</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                Tasks in this sprint haven't been given Story Point estimates yet, so total points are 0. Switch to <strong>Task Count</strong> to track by completed issues, or open tasks to set Story Points (1, 2, 3, 5, 8).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUnit("issues")}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shrink-0 transition-colors"
          >
            Switch to Task Count
          </button>
        </div>
      ) : !metrics.hasEstimates && unit === "issues" ? (
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300 text-xs">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Showing burndown by <strong>Task Count</strong> because tasks do not have story point estimates assigned.</span>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
            Committed ({unitLabel})
          </span>
          <p className="text-xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {committedVal}{" "}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{unitLabel}</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
            Completed ({unitLabel})
          </span>
          <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {completedVal}{" "}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{unitLabel}</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
            Remaining ({unitLabel})
          </span>
          <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {remainingVal}{" "}
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{unitLabel}</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
            Completion Rate
          </span>
          <p className="text-xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {rateVal}%
          </p>
        </div>
      </div>

      {/* Burndown Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                {isPointsMode ? "Remaining Story Points Burn-Line" : "Remaining Tasks Burn-Line"}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                Daily ideal vs actual progress ({unitLabel})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-t border-dashed"></span>
              <span>Ideal Burn</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
              <span>Actual Remaining</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            Calculating burndown metrics...
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(val, name) => [`${val} ${unitLabel}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey={isPointsMode ? "ideal" : "idealIssues"}
                  name={`Ideal Burndown (${unitLabel})`}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={isPointsMode ? "actual" : "actualIssues"}
                  name={`Actual Remaining (${unitLabel})`}
                  stroke="#6366f1"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sprint Issues Breakdown Table */}
      {data?.issues && data.issues.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                Sprint Task Breakdown ({data.issues.length} {data.issues.length === 1 ? "issue" : "issues"})
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              {metrics.completedIssues} of {metrics.totalIssues} completed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Key</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 text-right">Story Points</th>
                  <th className="py-2.5 px-3">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {data.issues.map((issue) => {
                  const isDone = issue.status === "Done";
                  return (
                    <tr key={issue._id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {issue.key || "-"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-slate-200 max-w-xs truncate">
                        {issue.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                              : issue.status === "In Progress"
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400">
                          {issue.priority || "Medium"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {issue.estimate > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {issue.estimate} pts
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600 text-[11px] font-normal">
                            0 pts (unestimated)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5 text-gray-600 dark:text-slate-400">
                          {issue.assignee?.avatar ? (
                            <img
                              src={issue.assignee.avatar}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className="text-[11px] truncate max-w-[120px]">
                            {issue.assignee?.name || "Unassigned"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BurndownTab;
