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
import { Users, CheckCircle2, CircleDot, Award } from "lucide-react";
import api from "../../utils/api";

const WorkloadTab = ({ projectId }) => {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api
      .get(`/v1/reports/workload?projectId=${projectId}`)
      .then((res) => {
        if (res.data.success) {
          setWorkload(res.data.workload || []);
        }
      })
      .catch((err) => console.error("Workload fetch error:", err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const totalPoints = workload.reduce((acc, w) => acc + (w.totalPoints || 0), 0);
  const totalOpen = workload.reduce((acc, w) => acc + (w.openIssues || 0), 0);
  const totalDone = workload.reduce((acc, w) => acc + (w.completedIssues || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Total Assigned Points
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900 dark:text-slate-100">{totalPoints} pts</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Across all team assignees</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Open Tasks in Flight
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CircleDot className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{totalOpen}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Active or backlog tasks</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">
              Completed Tasks
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalDone}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Resolved tasks</p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Workload by Team Member (Open vs Completed)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">Task distribution and capacity</span>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            Loading team workload metrics...
          </div>
        ) : workload.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 border border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
            No workload data available.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workload}
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
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar
                  dataKey="openIssues"
                  name="Open Tasks"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="completedIssues"
                  name="Completed Tasks"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {workload.map((m) => {
          const compRate =
            m.totalIssues > 0
              ? Math.round((m.completedIssues / m.totalIssues) * 100)
              : 0;

          return (
            <div
              key={m.userId || m.name}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100 leading-tight">{m.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{m.email || "Team Member"}</p>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  {m.totalPoints} pts
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-100 dark:border-slate-800">
                <span>{m.openIssues} open</span>
                <span>{m.completedIssues} done</span>
                <span className="font-bold text-gray-700 dark:text-slate-300">{compRate}%</span>
              </div>

              {/* Mini progress */}
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${compRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkloadTab;
