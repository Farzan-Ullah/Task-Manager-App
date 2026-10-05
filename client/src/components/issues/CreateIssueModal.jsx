import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { X, CheckSquare, Bug, Bookmark, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const CreateIssueModal = () => {
  const {
    isCreateIssueOpen,
    setIsCreateIssueOpen,
    currentProject,
    projects,
    currentWorkspace,
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
    Task: <CheckSquare className="w-4 h-4 text-blue-500" />,
    Bug: <Bug className="w-4 h-4 text-red-500" />,
    Story: <Bookmark className="w-4 h-4 text-emerald-500" />,
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
              <div className="flex space-x-1.5">
                {["Task", "Bug", "Story"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center space-x-1 transition-all ${
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                    {m.userId?.name || m.userId?.email || "Member"}
                  </option>
                ))}
              </select>
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
