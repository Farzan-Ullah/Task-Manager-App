import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Zap, TrendingUp, Award, BarChart2, Sparkles, Hash, Info } from "lucide-react";
import api from "../../utils/api";

const VelocityTab = ({ projectId }) => {
  const [velocityData, setVelocityData] = useState([]);
  const [hasEstimates, setHasEstimates] = useState(false);
  const [unit, setUnit] = useState("points"); // "points" | "issues"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api
      .get(`/v1/reports/velocity?projectId=${projectId}`)
      .then((res) => {
        if (res.data.success) {
          const list = res.data.velocity || [];
          setVelocityData(list);
          const hasEst = res.data.hasEstimates ?? list.some((v) => (v.committed || 0) > 0);
          setHasEstimates(hasEst);
          if (!hasEst && list.some((v) => (v.committedIssues || 0) > 0)) {
            setUnit("issues");
          } else if (hasEst) {
            setUnit("points");
          }
        }
      })
      .catch((err) => console.error("Velocity fetch error:", err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const isPointsMode = unit === "points";
  const unitLabel = isPointsMode ? "pts" : "tasks";

  const totalCompleted = velocityData.reduce(
    (acc, v) => acc + (isPointsMode ? v.completed || 0 : v.completedIssues || 0),
    0
  );
  const avgVelocity =
    velocityData.length > 0 ? (totalCompleted / velocityData.length).toFixed(1) : "0.0";
  const maxCompleted = Math.max(
    ...velocityData.map((v) => (isPointsMode ? v.completed || 0 : v.completedIssues || 0)),
    0
  );

  return (
    <div className="space-y-4">
      {/* Unit Selector & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            Velocity Metrics
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            Compare committed vs completed work across sprints
          </p>
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

      {/* Info Banner when unestimated */}
      {!hasEstimates && isPointsMode && velocityData.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl text-indigo-900 dark:text-indigo-200 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <p className="text-[11px]">
              Sprints do not have story point estimates assigned (all estimates are 0 pts). Switch to <strong>Task Count</strong> to view velocity by number of completed issues.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUnit("issues")}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shrink-0 transition-colors"
          >
            Switch to Task Count
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Average Velocity
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900 dark:text-slate-100">{avgVelocity}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            {unitLabel} per sprint
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Peak Velocity
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{maxCompleted}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            Highest {unitLabel} in a single sprint
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Tracked Sprints
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900 dark:text-slate-100">
            {velocityData.length}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Sprints tracked</p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Sprint Velocity Chart ({isPointsMode ? "Story Points" : "Task Count"})
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">
            Committed vs. completed {unitLabel} across iterations
          </span>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            Loading velocity statistics...
          </div>
        ) : velocityData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
            No sprints recorded to compute velocity.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={velocityData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis
                  dataKey="name"
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
                <Bar
                  dataKey={isPointsMode ? "committed" : "committedIssues"}
                  name={`Committed (${unitLabel})`}
                  fill="#93c5fd"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey={isPointsMode ? "completed" : "completedIssues"}
                  name={`Completed (${unitLabel})`}
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default VelocityTab;
