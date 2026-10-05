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
import { Flame, CheckCircle2, AlertCircle, ArrowUpRight, TrendingDown } from "lucide-react";
import api from "../../utils/api";

const BurndownTab = ({ projectId, sprints = [] }) => {
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const active = sprints.find((s) => s.status === "ACTIVE");
      setSelectedSprintId(active ? active._id : sprints[0]._id);
    }
  }, [sprints, selectedSprintId]);

  useEffect(() => {
    if (!selectedSprintId) return;
    setLoading(true);
    api
      .get(`/v1/reports/burndown?sprintId=${selectedSprintId}`)
      .then((res) => {
        if (res.data.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error("Burndown fetch error:", err))
      .finally(() => setLoading(false));
  }, [selectedSprintId]);

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
  };

  // Compute pace health
  const lastActual = (data?.timeline || [])
    .filter((t) => t.actual !== null)
    .pop();
  const isAhead =
    lastActual && lastActual.actual !== undefined
      ? lastActual.actual <= lastActual.ideal
      : true;

  return (
    <div className="space-y-4">
      {/* Top Filter and KPIs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
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

        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`px-3 py-1 rounded-xl font-bold flex items-center space-x-1 ${
              isAhead
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{isAhead ? "Pace: Ahead of Schedule" : "Pace: Behind Schedule"}</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Committed</span>
          <p className="text-xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {metrics.totalCommittedPoints} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pts</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Completed</span>
          <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.completedPoints} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pts</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Remaining</span>
          <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.remainingPoints} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">pts</span>
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Completion Rate</span>
          <p className="text-xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {metrics.completionPercentage}%
          </p>
        </div>
      </div>

      {/* Recharts Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Remaining Story Points Burn-Line
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">Daily ideal vs actual progress</span>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            Calculating burndown points...
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data?.timeline || []}
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
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name="Ideal Burndown"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Points Remaining"
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
    </div>
  );
};

export default BurndownTab;
