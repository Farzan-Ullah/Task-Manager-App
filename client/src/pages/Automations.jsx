import React, { useState, useEffect, useCallback } from "react";
import { Zap, Plus, Sparkles, Check, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import RuleCard from "../components/automations/RuleCard";
import CreateRuleModal from "../components/automations/CreateRuleModal";

const TEMPLATES = [
  {
    name: "Auto-escalate Bugs to High Priority",
    description: "When a new issue is logged as a Bug, immediately elevate its priority to High.",
    trigger: { type: "ISSUE_CREATED" },
    conditions: [{ field: "type", operator: "equals", value: "Bug" }],
    actions: [{ type: "SET_PRIORITY", config: { priority: "High" } }],
  },
  {
    name: "Auto-assign New Tasks to Project Lead",
    description: "Assign newly filed tasks directly to the Project Lead for initial triage.",
    trigger: { type: "ISSUE_CREATED" },
    conditions: [],
    actions: [{ type: "ASSIGN_USER", config: { target: "lead" } }],
  },
  {
    name: "Notify Reporter when Issue is Done",
    description: "Send an automated notification to the reporter whenever their task is marked Done.",
    trigger: { type: "STATUS_CHANGED" },
    conditions: [{ field: "status", operator: "equals", value: "Done" }],
    actions: [
      {
        type: "NOTIFY_USER",
        config: {
          target: "reporter",
          message: "Your reported issue was verified and marked as Done.",
        },
      },
    ],
  },
  {
    name: "Alert Team on Highest Priority Escalation",
    description: "Send an instant notification to all Project Members when an issue is escalated to Highest priority.",
    trigger: { type: "PRIORITY_CHANGED" },
    conditions: [{ field: "priority", operator: "equals", value: "Highest" }],
    actions: [
      {
        type: "NOTIFY_ROLE",
        config: {
          role: "Member",
          message: "Critical issue escalated to Highest priority.",
        },
      },
    ],
  },
];

const Automations = () => {
  const { currentProject } = useApp();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [installingTemplate, setInstallingTemplate] = useState(null);

  const fetchRules = useCallback(async () => {
    if (!currentProject?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/v1/automations?projectId=${currentProject._id}`);
      if (res.data.success) {
        setRules(res.data.automations || []);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
      toast.error("Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, [currentProject?._id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Toggle Rule Enable / Disable
  const handleToggleEnable = async (rule) => {
    const nextState = !rule.enabled;
    try {
      const res = await api.patch(`/v1/automations/${rule._id}`, {
        enabled: nextState,
        projectId: rule.projectId || currentProject?._id,
      });
      if (res.data.success) {
        setRules((prev) =>
          prev.map((r) => (r._id === rule._id ? { ...r, enabled: nextState } : r))
        );
        toast.success(
          nextState
            ? `Rule "${rule.name}" activated`
            : `Rule "${rule.name}" disabled`
        );
      }
    } catch {
      toast.error("Failed to update rule status");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;
    try {
      const res = await api.delete(
        `/v1/automations/${ruleId}?projectId=${currentProject?._id}`
      );
      if (res.data.success) {
        toast.success("Rule deleted");
        setRules((prev) => prev.filter((r) => r._id !== ruleId));
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  // Install Template
  const handleInstallTemplate = async (template) => {
    setInstallingTemplate(template.name);
    try {
      const res = await api.post("/v1/automations", {
        projectId: currentProject._id,
        name: template.name,
        trigger: template.trigger,
        conditions: template.conditions,
        actions: template.actions,
        enabled: true,
      });

      if (res.data.success) {
        toast.success(`Installed template: "${template.name}"`);
        setRules((prev) => [res.data.automation, ...prev]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to install template");
    } finally {
      setInstallingTemplate(null);
    }
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">No Project Selected</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mb-4">
            Select a project in the navigation bar to configure workflow automation rules.
          </p>
        </div>
      </div>
    );
  }

  const activeRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {currentProject.name} Automations
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              {currentProject.key}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Configure automated event triggers, conditional business rules, and background actions
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Automation Rule</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Active Rules</span>
          <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {activeRulesCount}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Currently monitoring project events</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Configured Rules</span>
          <p className="text-2xl font-mono font-bold text-gray-900 dark:text-slate-100 mt-1">
            {rules.length}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Total active and disabled rules</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Event Triggers</span>
          <p className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">4</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Created, Status, Priority, Sprint</p>
        </div>
      </div>

      {/* Section 1: Active Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Active Rules ({rules.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800">
            Loading automation rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
            <Zap className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">No automation rules configured</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              Click "New Automation Rule" or choose a prebuilt template below to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rules.map((rule) => (
              <RuleCard
                key={rule._id}
                rule={rule}
                onToggleEnable={handleToggleEnable}
                onDeleteRule={handleDeleteRule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Prebuilt Templates Library */}
      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              Prebuilt Automation Templates
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            1-click install standard industry automations tailored for Agile teams
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {TEMPLATES.map((tmpl, idx) => {
            const isInstalled = rules.some((r) => r.name === tmpl.name);
            const isInstalling = installingTemplate === tmpl.name;

            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100">{tmpl.name}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                <div className="pt-2 flex justify-end border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isInstalled || isInstalling}
                    onClick={() => handleInstallTemplate(tmpl)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      isInstalled
                        ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900/50"
                    }`}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Installed</span>
                      </>
                    ) : isInstalling ? (
                      <span>Installing...</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Install Template</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Custom Rule Modal */}
      <CreateRuleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentProject={currentProject}
        onRuleCreated={(newRule) => {
          setRules((prev) => [newRule, ...prev]);
        }}
      />
    </div>
  );
};

export default Automations;
