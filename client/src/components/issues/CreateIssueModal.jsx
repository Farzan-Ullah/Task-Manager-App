import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  CheckSquare,
  Bug,
  Bookmark,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const CreateIssueModal = () => {
  const {
    isCreateIssueOpen,
    setIsCreateIssueOpen,
    currentProject,
    projects,
    currentWorkspace,
    workspaceMembers = [],
    user,
  } = useApp();

  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("Task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [estimate, setEstimate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [sprints, setSprints] = useState([]);
  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Check if current user has Project Manager / Admin permissions
  const isManager = React.useMemo(() => {
    if (!user) return false;
    const uid = (user.userId || user._id)?.toString();
    if (!uid) return false;
    if (user.role === "Admin" || user.role === "admin") return true;

    if (currentWorkspace) {
      const ownerId = (currentWorkspace.owner?._id || currentWorkspace.owner)?.toString();
      if (ownerId && ownerId === uid) return true;
    }
    const wkspMember = workspaceMembers.find((m) => {
      const mId = (m.userId?._id || m.userId || m._id)?.toString();
      return mId === uid;
    });
    if (
      wkspMember &&
      (wkspMember.role === "Workspace Admin" ||
        wkspMember.role === "Project Manager" ||
        wkspMember.role === "Admin")
    ) {
      return true;
    }

    if (currentProject) {
      const leadId = (currentProject.leadId?._id || currentProject.leadId)?.toString();
      if (leadId && leadId === uid) return true;

      const projMembers = currentProject.members || [];
      const projMember = projMembers.find((m) => {
        const mId = (m.userId?._id || m.userId || m._id)?.toString();
        return mId === uid;
      });
      if (
        projMember &&
        (projMember.role === "Project Manager" ||
          projMember.role === "Workspace Admin" ||
          projMember.role === "Admin")
      ) {
        return true;
      }
    }

    return false;
  }, [user, currentWorkspace, workspaceMembers, currentProject]);

  // Combine project members and workspace employees so any teammate can be assigned
  const eligibleAssignees = React.useMemo(() => {
    const map = new Map();

    // 1. Add members from selected project
    if (Array.isArray(members)) {
      members.forEach((m) => {
        const u = m.userId?._id ? m.userId : (typeof m.userId === "string" ? { _id: m.userId } : m);
        if (u?._id) {
          map.set(u._id.toString(), {
            _id: u._id.toString(),
            name: u.name || "Member",
            email: u.email || "",
            role: m.role || u.role || "Member",
          });
        }
      });
    }

    // 2. Add all workspace members/employees
    if (Array.isArray(workspaceMembers)) {
      workspaceMembers.forEach((wm) => {
        const id = wm._id?.toString() || wm.userId?._id?.toString() || wm.userId?.toString();
        if (id && !map.has(id)) {
          map.set(id, {
            _id: id,
            name: wm.name || wm.userId?.name || "Employee",
            email: wm.email || wm.userId?.email || "",
            role: wm.role || "Member",
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, workspaceMembers]);

  useEffect(() => {
    if (currentProject?._id) {
      setProjectId(currentProject._id);
    } else if (projects.length > 0) {
      setProjectId(projects[0]._id);
    }
  }, [currentProject?._id, projects]);

  // Load sprints and members for selected project
  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      try {
        const [sprintsRes, projectRes] = await Promise.all([
          api.get(`/v1/sprints?projectId=${projectId}`),
          api.get(`/v1/projects/${projectId}`),
        ]);

        if (sprintsRes.data.success) {
          setSprints(sprintsRes.data.sprints || []);
        }

        if (projectRes.data.success && projectRes.data.project?.members) {
          setMembers(projectRes.data.project.members || []);
        }
      } catch (err) {
        console.error("Failed to load project details for issue modal:", err);
      }
    };

    loadProjectData();
  }, [projectId]);

  if (!isCreateIssueOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      toast.error("Please provide an issue title and select a project");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectId,
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
        estimate: Number(estimate) || 0,
        dueDate: dueDate || null,
      };

      const res = await api.post("/v1/issues", payload);
      if (res.data.success) {
        toast.success(`Issue ${res.data.issue.key} created!`);
        setTitle("");
        setDescription("");
        setEstimate("");
        setDueDate("");
        setAssigneeId("");
        setSprintId("");
        setIsCreateIssueOpen(false);

        // Notify other components via custom event
        window.dispatchEvent(new CustomEvent("issue-created-global", { detail: res.data.issue }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const typeIcons = {
    Task: <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
    Bug: <Bug className="w-3.5 h-3.5 text-red-500" />,
    Story: <Bookmark className="w-3.5 h-3.5 text-emerald-500" />,
    Issue: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    Request: <HelpCircle className="w-3.5 h-3.5 text-purple-500" />,
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-transparent dark:border-slate-800 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              +
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Issue</h3>
          </div>
          <button
            onClick={() => setIsCreateIssueOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Jira-style role awareness banner */}
        {!isManager && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Team Member Mode:</span> You can report bugs, issues, or requests. Delegation across teammates is managed by Project Managers.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Issue Type *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["Task", "Bug", "Story", "Issue", "Request"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center space-x-1 transition-all ${
                      type === t
                        ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-semibold"
                        : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {typeIcons[t]}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Add details, context, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="Highest">🔴 Highest</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🔵 Low</option>
                <option value="Lowest">⚪ Lowest</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Assignee
                </label>
                {!isManager && (
                  <span
                    className="flex items-center space-x-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                    title="Managers assign tasks to employees"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Manager only</span>
                  </span>
                )}
              </div>

              {isManager ? (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                >
                  <option value="">Unassigned</option>
                  {eligibleAssignees.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.email ? `(${u.email})` : `(${u.role})`}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
                >
                  <option value="">Unassigned (Manager will assign)</option>
                  <option value={user?.userId || user?._id}>
                    Assign to me ({user?.name || "Self"})
                  </option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Sprint
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Story Points (Estimate)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1, 2, 3, 5, 8"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateIssueOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIssueModal;
