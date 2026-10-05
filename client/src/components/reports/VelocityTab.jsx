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
import { Zap, TrendingUp, Award, BarChart2 } from "lucide-react";
import api from "../../utils/api";

const VelocityTab = ({ projectId }) => {
  const [velocityData, setVelocityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api
      .get(`/v1/reports/velocity?projectId=${projectId}`)
      .then((res) => {
        if (res.data.success) {
          setVelocityData(res.data.velocity || []);
        }
      })
      .catch((err) => console.error("Velocity fetch error:", err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const totalCompleted = velocityData.reduce((acc, v) => acc + (v.completed || 0), 0);
  const avgVelocity =
    velocityData.length > 0 ? (totalCompleted / velocityData.length).toFixed(1) : "0.0";
  const maxCompleted = Math.max(...velocityData.map((v) => v.completed || 0), 0);

  return (
    <div className="space-y-4">
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
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Story points per sprint</p>
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
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Highest points in a sprint</p>
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
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Sprints completed/in progress</p>
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
              Sprint Velocity Chart (Committed vs. Completed)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">Story points throughput across iterations</span>
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
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar
                  dataKey="committed"
                  name="Committed Points"
                  fill="#93c5fd"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Completed Points"
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
