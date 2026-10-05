import React from "react";
import { Zap, ArrowRight, Trash2, CheckCircle2, Filter, Sparkles } from "lucide-react";

const RuleCard = ({ rule, onToggleEnable, onDeleteRule }) => {
  const triggerLabels = {
    STATUS_CHANGED: "When status changes",
    PRIORITY_CHANGED: "When priority changes",
    ISSUE_CREATED: "When an issue is created",
    SPRINT_STARTED: "When sprint is started",
  };

  const actionLabels = {
    SET_PRIORITY: (cfg) => `Set priority to ${cfg.priority || "High"}`,
    SET_STATUS: (cfg) => `Set status to ${cfg.status || "Done"}`,
    ASSIGN_USER: (cfg) => `Assign to ${cfg.target === "lead" ? "Project Lead" : "User"}`,
    NOTIFY_USER: (cfg) => `Notify ${cfg.target || "stakeholder"}`,
    NOTIFY_ROLE: (cfg) => `Notify all ${cfg.role || "Members"}`,
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        rule.enabled
          ? "bg-white dark:bg-slate-900 border-gray-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs"
          : "bg-gray-50/70 dark:bg-slate-900/40 border-gray-200/60 dark:border-slate-800 opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              rule.enabled
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 text-xs truncate">{rule.name}</h3>
            <span
              className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                rule.enabled
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              }`}
            >
              {rule.enabled ? "Active" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggleEnable && onToggleEnable(rule)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rule.enabled ? "bg-amber-500" : "bg-gray-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                rule.enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDeleteRule && onDeleteRule(rule._id)}
            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
            title="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logic Steps Visual Pills */}
      <div className="space-y-1.5 text-[11px] pt-1">
        {/* Trigger */}
        <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-transparent dark:border-indigo-900/40">
          <Zap className="w-3 h-3 shrink-0" />
          <span className="font-semibold truncate">
            {triggerLabels[rule.trigger?.type] || rule.trigger?.type}
          </span>
        </div>

        {/* Conditions */}
        {rule.conditions && rule.conditions.length > 0 && (
          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-950/40 px-2.5 py-1 rounded-xl border border-transparent dark:border-purple-900/40">
            <Filter className="w-3 h-3 shrink-0" />
            <span className="font-medium truncate">
              If {rule.conditions[0].field} {rule.conditions[0].operator}{" "}
              <strong>"{rule.conditions[0].value}"</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        {rule.actions && rule.actions.length > 0 && (
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-transparent dark:border-emerald-900/40">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="font-semibold truncate">
              {actionLabels[rule.actions[0].type]
                ? actionLabels[rule.actions[0].type](rule.actions[0].config || {})
                : rule.actions[0].type}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleCard;
