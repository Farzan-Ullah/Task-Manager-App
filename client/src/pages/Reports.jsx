import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart as LineChartIcon,
  Flame,
  Zap,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import BurndownTab from "../components/reports/BurndownTab";
import VelocityTab from "../components/reports/VelocityTab";
import CumulativeFlowTab from "../components/reports/CumulativeFlowTab";
import WorkloadTab from "../components/reports/WorkloadTab";

const Reports = () => {
  const { currentProject } = useApp();

  const [activeTab, setActiveTab] = useState("burndown"); // "burndown" | "velocity" | "cfd" | "workload"
  const [summary, setSummary] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sumRes, sprintsRes] = await Promise.all([
        api.get(`/v1/reports/summary?projectId=${currentProject._id}`),
        api.get(`/v1/sprints?projectId=${currentProject._id}`),
      ]);

      if (sumRes.data.success) {
        setSummary(sumRes.data.summary);
      }
      if (sprintsRes.data.success) {
        setSprints(sprintsRes.data.sprints || []);
      }
    } catch (err) {
      console.error("Failed to load reports summary:", err);
      toast.error("Failed to load report analytics");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <LineChartIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">No Project Selected</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mb-4">
            Select a project in the navigation bar to inspect its Agile analytics and velocity charts.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "burndown", label: "Sprint Burndown", icon: Flame },
    { id: "velocity", label: "Sprint Velocity", icon: Zap },
    { id: "cfd", label: "Cumulative Flow (CFD)", icon: Layers },
    { id: "workload", label: "Team Workload", icon: Users },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            {currentProject.name} Reports & Analytics
          </h1>
          <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
            {currentProject.key}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          Agile delivery metrics, burndown health, team velocity, and cumulative flow distribution
        </p>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Total Tasks</span>
          <p className="text-xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {summary?.totalIssues || 0}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Completion Rate</span>
          <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.completionRate || 0}%
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">In Progress</span>
          <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
            {summary?.inProgress || 0}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">High Priority</span>
          <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
            {summary?.highPriority || 0}
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Overdue</span>
          <p className="text-xl font-mono font-bold text-red-600 dark:text-red-400 mt-1">
            {summary?.overdue || 0}
          </p>
        </div>
      </div>

      {/* Tab Navigation Ribbon */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100/90 dark:bg-slate-900 rounded-2xl border border-gray-200/60 dark:border-slate-800 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs ring-1 ring-gray-200/80 dark:ring-slate-700"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      {activeTab === "burndown" && (
        <BurndownTab projectId={currentProject._id} sprints={sprints} />
      )}

      {activeTab === "velocity" && (
        <VelocityTab projectId={currentProject._id} />
      )}

      {activeTab === "cfd" && (
        <CumulativeFlowTab projectId={currentProject._id} />
      )}

      {activeTab === "workload" && (
        <WorkloadTab projectId={currentProject._id} />
      )}
    </div>
  );
};

export default Reports;
