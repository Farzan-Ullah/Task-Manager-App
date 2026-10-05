import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  CheckSquare,
  Bug,
  Bookmark,
  Copy,
  Calendar,
  Clock,
  Eye,
  Trash2,
  ExternalLink,
  MessageSquare,
  History,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";
import RichTextEditor from "../common/RichTextEditor";
import SubtasksManager from "./SubtasksManager";
import AttachmentsManager from "./AttachmentsManager";
import CommentsSection from "./CommentsSection";
import ActivityFeed from "./ActivityFeed";

const IssueDetailModal = () => {
  const { currentProject, user, startTimer } = useApp();
  const [issueId, setIssueId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("comments"); // "comments" | "activity"

  // Editable local fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDescDirty, setIsDescDirty] = useState(false);

  const [sprints, setSprints] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);

  // Listen to open-issue-detail event
  useEffect(() => {
    const handleOpen = (e) => {
      const rawId = e.detail?.issueId;
      if (rawId) {
        const cleanId =
          typeof rawId === "object" ? (rawId._id || rawId.id || rawId.key) : rawId;
        if (cleanId && typeof cleanId === "string" && cleanId !== "[object Object]") {
          setIssueId(cleanId);
        }
      }
    };
    window.addEventListener("open-issue-detail", handleOpen);
    return () => window.removeEventListener("open-issue-detail", handleOpen);
  }, []);

  // Fetch issue details
  const fetchIssueDetails = useCallback(async (id) => {
    const cleanId = typeof id === "object" ? (id._id || id.id || id.key) : id;
    if (!cleanId || typeof cleanId !== "string" || cleanId === "[object Object]") return;
    setLoading(true);
    try {
      const res = await api.get(`/v1/issues/${cleanId}`);
      if (res.data.success) {
        setData(res.data);
        setTitle(res.data.issue.title || "");
        setDescription(res.data.issue.description || "");
        setIsDescDirty(false);
      }
    } catch (err) {
      toast.error("Failed to load issue details");
      setIssueId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (issueId) {
      fetchIssueDetails(issueId);
    } else {
      setData(null);
    }
  }, [issueId, fetchIssueDetails]);

  // Load sprints & members
  useEffect(() => {
    if (!currentProject?._id) return;
    api.get(`/v1/sprints?projectId=${currentProject._id}`).then((res) => {
      if (res.data.success) setSprints(res.data.sprints || []);
    });
    setProjectMembers(currentProject.members || []);
  }, [currentProject?._id, currentProject?.members]);

  if (!issueId) return null;

  const issue = data?.issue;

  const handleFieldUpdate = async (field, value) => {
    if (!issueId) return;
    try {
      const res = await api.patch(`/v1/issues/${issueId}`, { [field]: value });
      if (res.data.success) {
        setData((prev) => ({
          ...prev,
          issue: { ...prev.issue, ...res.data.issue },
        }));
        toast.success(`Updated ${field}`);
      }
    } catch (err) {
      toast.error("Failed to update issue");
    }
  };

  const handleSaveDescription = async () => {
    await handleFieldUpdate("description", description);
    setIsDescDirty(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${issue?._id}`);
    toast.success("Share link copied!");
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${issue?.key}?`)) return;
    try {
      await api.delete(`/v1/issues/${issueId}`);
      toast.success("Issue deleted");
      setIssueId(null);
    } catch {
      toast.error("Failed to delete issue");
    }
  };

  const typeIcons = {
    Task: <CheckSquare className="w-4 h-4 text-blue-500" />,
    Bug: <Bug className="w-4 h-4 text-red-500" />,
    Story: <Bookmark className="w-4 h-4 text-emerald-500" />,
  };

  const priorityColors = {
    Highest: "text-red-600 bg-red-50 border-red-200",
    High: "text-orange-600 bg-orange-50 border-orange-200",
    Medium: "text-amber-600 bg-amber-50 border-amber-200",
    Low: "text-blue-600 bg-blue-50 border-blue-200",
    Lowest: "text-gray-600 bg-gray-50 border-gray-200",
  };

  const isWatching = issue?.watchers?.some((w) => (w._id || w) === user?.userId);

  const toggleWatch = async () => {
    const updatedWatchers = isWatching
      ? (issue.watchers || []).filter((w) => (w._id || w) !== user?.userId)
      : [...(issue.watchers || []), user?.userId];
    await handleFieldUpdate("watchers", updatedWatchers);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={() => setIssueId(null)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-transparent dark:border-slate-800 w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-slate-950/60">
          <div className="flex items-center space-x-3">
            {/* Type selector */}
            <select
              value={issue?.type || "Task"}
              onChange={(e) => handleFieldUpdate("type", e.target.value)}
              className="text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-2 py-1 outline-none"
            >
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Story">Story</option>
            </select>

            <span className="font-mono text-sm font-bold text-gray-700 dark:text-slate-300 bg-gray-200/80 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-gray-300/50 dark:border-slate-700">
              {issue?.key}
            </span>

            <button
              onClick={handleCopyLink}
              title="Copy share link"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => startTimer(issue)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Start Timer</span>
            </button>

            <button
              onClick={() => setIssueId(null)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: 2 Columns */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            Loading issue details...
          </div>
        ) : issue ? (
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
            {/* Left Column: Primary Content (65%) */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-gray-100 dark:border-slate-800">
              {/* Editable Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    if (title.trim() && title !== issue.title) {
                      handleFieldUpdate("title", title.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.target.blur();
                    }
                  }}
                  className="w-full text-xl font-bold text-gray-900 dark:text-white border-none outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-xl px-2 py-1 -ml-2 hover:bg-gray-50 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-850 transition-all"
                  placeholder="Issue title"
                />
              </div>

              {/* Description (Rich Text Editor) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Description
                  </label>
                  {isDescDirty && (
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                    >
                      Save Description
                    </button>
                  )}
                </div>
                <RichTextEditor
                  content={description}
                  onChange={(val) => {
                    setDescription(val);
                    setIsDescDirty(true);
                  }}
                  placeholder="Add detailed description, repro steps, acceptance criteria..."
                  minHeight="140px"
                />
              </div>

              {/* Subtasks Section */}
              <div className="pt-2 border-t border-gray-100">
                <SubtasksManager
                  parentIssue={issue}
                  subtasks={data.subtasks || []}
                  onSubtasksChanged={() => fetchIssueDetails(issueId)}
                />
              </div>

              {/* Attachments Section */}
              <div className="pt-2 border-t border-gray-100">
                <AttachmentsManager
                  issue={issue}
                  attachments={issue.attachments || []}
                  onAttachmentsChanged={() => fetchIssueDetails(issueId)}
                />
              </div>

              {/* Comments & Activity Tabs */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-4 border-b border-gray-100 dark:border-slate-800 mb-4">
                  <button
                    onClick={() => setActiveTab("comments")}
                    className={`flex items-center space-x-1.5 pb-2.5 text-xs font-bold border-b-2 transition-all ${
                      activeTab === "comments"
                        ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comments ({(data.comments || []).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`flex items-center space-x-1.5 pb-2.5 text-xs font-bold border-b-2 transition-all ${
                      activeTab === "activity"
                        ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Activity ({(data.activities || []).length})</span>
                  </button>
                </div>

                {activeTab === "comments" ? (
                  <CommentsSection
                    issue={issue}
                    comments={data.comments || []}
                    projectMembers={projectMembers}
                    onCommentAdded={() => fetchIssueDetails(issueId)}
                  />
                ) : (
                  <ActivityFeed activities={data.activities || []} />
                )}
              </div>
            </div>

            {/* Right Column: Metadata Sidebar (35%) */}
            <div className="w-full md:w-80 p-6 bg-gray-50/50 dark:bg-slate-950/40 border-l border-transparent dark:border-slate-800 space-y-5 text-xs shrink-0 overflow-y-auto">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={issue.status}
                  onChange={(e) => handleFieldUpdate("status", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Backlog">Backlog</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Testing">Testing</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={issue.priority}
                  onChange={(e) => handleFieldUpdate("priority", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    priorityColors[issue.priority] || "text-gray-800 dark:text-slate-200"
                  }`}
                >
                  <option value="Highest">Highest</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Lowest">Lowest</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  value={issue.assigneeId?._id || issue.assigneeId || ""}
                  onChange={(e) => handleFieldUpdate("assigneeId", e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((m) => (
                    <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                      {m.userId?.name || m.userId?.email || "Member"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reporter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Reporter
                </label>
                <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {(issue.reporterId?.name || issue.reporterId?.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium truncate">
                    {issue.reporterId?.name || issue.reporterId?.email || "Admin"}
                  </span>
                </div>
              </div>

              {/* Sprint */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Sprint
                </label>
                <select
                  value={issue.sprintId?._id || issue.sprintId || ""}
                  onChange={(e) => handleFieldUpdate("sprintId", e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Story Points Estimate */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Story Points Estimate
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={issue.estimate || ""}
                  onChange={(e) => handleFieldUpdate("estimate", Number(e.target.value) || 0)}
                  placeholder="e.g. 1, 2, 3, 5, 8"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={issue.dueDate ? moment(issue.dueDate).format("YYYY-MM-DD") : ""}
                  onChange={(e) => handleFieldUpdate("dueDate", e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Time Tracking Progress */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700 dark:text-slate-300">Time Logged</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {(data.totalMinutesLogged / 60).toFixed(1)}h
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startTimer(issue)}
                  className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Stopwatch</span>
                </button>
              </div>

              {/* Watchers */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 dark:border-slate-800">
                <div className="flex items-center space-x-1.5 text-gray-600 dark:text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{(issue.watchers || []).length} Watcher(s)</span>
                </div>
                <button
                  onClick={toggleWatch}
                  className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                    isWatching
                      ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {isWatching ? "Watching" : "Watch"}
                </button>
              </div>

              {/* Delete Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full py-2 px-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Issue</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default IssueDetailModal;
