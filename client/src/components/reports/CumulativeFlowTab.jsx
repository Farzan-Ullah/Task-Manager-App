import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Layers, Info } from "lucide-react";
import api from "../../utils/api";

const CumulativeFlowTab = ({ projectId }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api
      .get(`/v1/reports/cumulative-flow?projectId=${projectId}&days=${days}`)
      .then((res) => {
        if (res.data.success) {
          setData(res.data.cumulativeFlow || []);
        }
      })
      .catch((err) => console.error("CFD fetch error:", err))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  return (
    <div className="space-y-4">
      {/* Top Range Selector & Explanatory Tip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">
            Time Span:
          </span>
          <div className="flex items-center space-x-1.5">
            {[14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  days === d
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px]">
            A parallel band indicates stable throughput; widening bands highlight WIP bottlenecks.
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Cumulative Flow Diagram (CFD)
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">Status work-in-progress over time</span>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
            Calculating cumulative flow points...
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorTodo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorBacklog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
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
                <Area
                  type="monotone"
                  dataKey="Done"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#colorDone)"
                />
                <Area
                  type="monotone"
                  dataKey="Review"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="url(#colorReview)"
                />
                <Area
                  type="monotone"
                  dataKey="In Progress"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="url(#colorInProgress)"
                />
                <Area
                  type="monotone"
                  dataKey="To Do"
                  stackId="1"
                  stroke="#6366f1"
                  fill="url(#colorTodo)"
                />
                <Area
                  type="monotone"
                  dataKey="Backlog"
                  stackId="1"
                  stroke="#94a3b8"
                  fill="url(#colorBacklog)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default CumulativeFlowTab;
