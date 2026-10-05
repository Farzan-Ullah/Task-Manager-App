import React, { useState } from "react";
import { X, Zap, ArrowRight, Check, Plus, Trash2, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const TRIGGER_OPTIONS = [
  { value: "STATUS_CHANGED", label: "When status changes" },
  { value: "PRIORITY_CHANGED", label: "When priority changes" },
  { value: "ISSUE_CREATED", label: "When an issue is created" },
];

const ACTION_TYPES = [
  { value: "SET_PRIORITY", label: "Set Priority" },
  { value: "SET_STATUS", label: "Set Status" },
  { value: "ASSIGN_USER", label: "Assign Issue" },
  { value: "NOTIFY_USER", label: "Send Notification" },
];

const CreateRuleModal = ({ isOpen, onClose, currentProject, onRuleCreated }) => {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("STATUS_CHANGED");

  // Condition
  const [useCondition, setUseCondition] = useState(true);
  const [condField, setCondField] = useState("status");
  const [condOperator, setCondOperator] = useState("equals");
  const [condValue, setCondValue] = useState("Done");

  // Action
  const [actionType, setActionType] = useState("NOTIFY_USER");
  const [actionTarget, setActionTarget] = useState("reporter");
  const [actionValue, setActionValue] = useState("High");
  const [actionMessage, setActionMessage] = useState("Task was marked Done by teammate");

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentProject?._id) return;

    // Build conditions array
    const conditions = useCondition
      ? [
          {
            field: condField,
            operator: condOperator,
            value: condValue,
          },
        ]
      : [];

    // Build action config
    const actionConfig = {};
    if (actionType === "SET_PRIORITY") {
      actionConfig.priority = actionValue;
    } else if (actionType === "SET_STATUS") {
      actionConfig.status = actionValue;
    } else if (actionType === "ASSIGN_USER") {
      actionConfig.target = actionTarget; // "lead" or memberId
      if (actionTarget !== "lead") actionConfig.assigneeId = actionTarget;
    } else if (actionType === "NOTIFY_USER") {
      actionConfig.target = actionTarget; // "reporter" or "assignee"
      actionConfig.message = actionMessage.trim();
    }

    const actions = [
      {
        type: actionType,
        config: actionConfig,
      },
    ];

    setLoading(true);
    try {
      const res = await api.post("/v1/automations", {
        projectId: currentProject._id,
        name: name.trim(),
        trigger: { type: triggerType },
        conditions,
        actions,
        enabled: true,
      });

      if (res.data.success) {
        toast.success(`Automation "${res.data.automation.name}" created!`);
        onRuleCreated && onRuleCreated(res.data.automation);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create automation rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/40 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 fill-amber-600 dark:fill-amber-400 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">New Automation Rule</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Configure trigger, condition, and action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Rule Name */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Notify reporter when status is Done"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500/50 outline-none text-xs font-semibold text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Trigger Section */}
          <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>1. TRIGGER: WHEN THIS HAPPENS...</span>
            </div>
            <select
              value={triggerType}
              onChange={(e) => {
                const val = e.target.value;
                setTriggerType(val);
                if (val === "STATUS_CHANGED") setCondField("status");
                else if (val === "PRIORITY_CHANGED") setCondField("priority");
                else if (val === "ISSUE_CREATED") setCondField("type");
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Section */}
          <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-bold">
                <Filter className="w-3.5 h-3.5" />
                <span>2. CONDITION: IF THIS IS TRUE...</span>
              </div>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCondition}
                  onChange={(e) => setUseCondition(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <span className="text-[11px] text-gray-600 dark:text-slate-300 font-semibold">Enable Condition</span>
              </label>
            </div>

            {useCondition && (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={condField}
                  onChange={(e) => setCondField(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-800 dark:text-slate-100"
                >
                  <option value="status">Status</option>
                  <option value="priority">Priority</option>
                  <option value="type">Type</option>
                </select>

                <select
                  value={condOperator}
                  onChange={(e) => setCondOperator(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-800 dark:text-slate-100"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Does Not Equal</option>
                </select>

                <input
                  type="text"
                  required
                  value={condValue}
                  onChange={(e) => setCondValue(e.target.value)}
                  placeholder="e.g. Done or Bug"
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                />
              </div>
            )}
          </div>

          {/* Action Section */}
          <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3. ACTION: THEN DO THIS...</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>

              {/* Action config parameter depending on type */}
              {actionType === "SET_PRIORITY" && (
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100"
                >
                  <option value="Highest">Highest</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              )}

              {actionType === "SET_STATUS" && (
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Testing">Testing</option>
                  <option value="Done">Done</option>
                </select>
              )}

              {actionType === "ASSIGN_USER" && (
                <select
                  value={actionTarget}
                  onChange={(e) => setActionTarget(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100"
                >
                  <option value="lead">Project Lead</option>
                  {(currentProject?.members || []).map((m) => (
                    <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                      {m.userId?.name || m.userId?.email}
                    </option>
                  ))}
                </select>
              )}

              {actionType === "NOTIFY_USER" && (
                <select
                  value={actionTarget}
                  onChange={(e) => setActionTarget(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100"
                >
                  <option value="reporter">Issue Reporter</option>
                  <option value="assignee">Issue Assignee</option>
                  <option value="lead">Project Lead</option>
                </select>
              )}
            </div>

            {actionType === "NOTIFY_USER" && (
              <input
                type="text"
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Notification message body"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-slate-500"
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Creating..." : "Save Automation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRuleModal;
