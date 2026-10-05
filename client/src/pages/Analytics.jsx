import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { CircleDot } from "lucide-react";

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/todos/analytics/month");
        if (res.data.success) {
          setAnalytics(res.data.lengths);
        }
      } catch (error) {
        toast.error("Failed to fetch analytics");
      }
    };
    fetchAnalytics();
  }, []);

  if (!analytics) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading analytics...</div>;

  const data = [
    { label: "Backlog Tasks", value: analytics.BACKLOG, color: "text-gray-500 dark:text-slate-400" },
    { label: "To-do Tasks", value: analytics.TODO, color: "text-blue-500" },
    { label: "In-Progress Tasks", value: analytics.PROGRESS, color: "text-yellow-500" },
    { label: "Completed Tasks", value: analytics.DONE, color: "text-green-500" },
  ];

  const priorities = [
    { label: "Low Priority", value: analytics.LowPr, color: "text-green-500" },
    { label: "Moderate Priority", value: analytics.ModeratePr, color: "text-blue-500" },
    { label: "High Priority", value: analytics.HighPr, color: "text-red-500" },
    { label: "Due Date Tasks", value: analytics.dueDateTasks, color: "text-indigo-500" },
  ];

  const renderCard = (items, title) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">{title}</h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center">
              <CircleDot className={`w-4 h-4 mr-3 ${item.color}`} />
              <span className="text-gray-700 dark:text-slate-300 font-medium">{item.label}</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Analytics Dashboard</h1>
      <p className="text-gray-500 dark:text-slate-400 mb-8">Showing data for the current month.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderCard(data, "Task Status")}
        {renderCard(priorities, "Task Priority")}
      </div>
    </div>
  );
};

export default Analytics;
