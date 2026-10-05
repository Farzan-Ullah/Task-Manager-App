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
  Lock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";
import RichTextEditor from "../common/RichTextEditor";
import SubtasksManager from "./SubtasksManager";
import AttachmentsManager from "./AttachmentsManager";
import DevelopmentPanel from "./DevelopmentPanel";
import CommentsSection from "./CommentsSection";
import ActivityFeed from "./ActivityFeed";

const IssueDetailModal = () => {
  const { currentProject, currentWorkspace, user, startTimer, workspaceMembers = [], isGuest } = useApp();
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

  // Combine project members and workspace employees so any teammate can be assigned
  const eligibleAssignees = React.useMemo(() => {
    const map = new Map();

    if (Array.isArray(projectMembers)) {
      projectMembers.forEach((m) => {
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
  }, [projectMembers, workspaceMembers]);

  // Determine if the current logged-in user has Project Manager / Admin privileges
  const isManager = React.useMemo(() => {
    if (!user || isGuest) return false;
    const uid = (user.userId || user._id)?.toString();
    if (!uid) return false;
    if (user.role === "Admin" || user.role === "admin") return true;

    // Check workspace ownership/role
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

    // Check project lead or project manager
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
        window.dispatchEvent(
          new CustomEvent("issue-updated-global", { detail: res.data.issue })
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update ${field}`);
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
      window.dispatchEvent(
        new CustomEvent("issue-deleted-global", { detail: { issueId } })
      );
    } catch {
      toast.error("Failed to delete issue");
    }
  };

  const typeIcons = {
    Task: <CheckSquare className="w-4 h-4 text-blue-500" />,
    Bug: <Bug className="w-4 h-4 text-red-500" />,
    Story: <Bookmark className="w-4 h-4 text-emerald-500" />,
    Issue: <AlertCircle className="w-4 h-4 text-amber-500" />,
    Request: <HelpCircle className="w-4 h-4 text-purple-500" />,
  };

  const priorityColors = {
    Highest: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40",
    High: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40",
    Medium: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
    Low: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
    Lowest: "text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700",
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
            {/* Type selector: Editable for PM, Read-only badge for Employee */}
            {isManager ? (
              <select
                value={issue?.type || "Task"}
                onChange={(e) => handleFieldUpdate("type", e.target.value)}
                className="text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-2 py-1 outline-none"
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
                <option value="Story">Story</option>
                <option value="Issue">Issue</option>
                <option value="Request">Request</option>
              </select>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-200">
                {typeIcons[issue?.type] || typeIcons.Task}
                <span>{issue?.type || "Task"}</span>
              </div>
            )}

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
            {!isGuest && (
              <button
                onClick={() => startTimer(issue)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Start Timer</span>
              </button>
            )}

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
              {/* Title: Editable for PM, Read-only heading for Employee */}
              <div>
                {isManager ? (
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
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white px-2 py-1 -ml-2 leading-snug">
                      {issue.title}
                    </h2>
                    <span className="flex items-center space-x-1 text-[10px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-1 rounded-md font-semibold shrink-0">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>{isGuest ? "Guest (Read-Only)" : "Manager Controlled"}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Description: Editable for PM, Read-only formatted view for Employee */}
              <div>
                {isManager ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
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
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>Description</span>
                        <span className="text-[10px] font-normal text-gray-400 dark:text-slate-500 flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>({isGuest ? "Read-only for guests" : "Read-only for employees"})</span>
                        </span>
                      </label>
                    </div>
                    <div className="p-4 bg-gray-50/80 dark:bg-slate-950/60 rounded-xl border border-gray-200/80 dark:border-slate-800 text-xs sm:text-sm text-gray-800 dark:text-slate-200 leading-relaxed min-h-[90px]">
                      {issue.description ? (
                        <div
                          className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
                          dangerouslySetInnerHTML={{ __html: issue.description }}
                        />
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                          No description provided for this task.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <SubtasksManager
                  parentIssue={issue}
                  subtasks={data.subtasks || []}
                  isGuest={isGuest}
                  onSubtasksChanged={() => fetchIssueDetails(issueId)}
                />
              </div>

              {/* Attachments Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <AttachmentsManager
                  issue={issue}
                  attachments={issue.attachments || []}
                  isGuest={isGuest}
                  onAttachmentsChanged={() => fetchIssueDetails(issueId)}
                />
              </div>

              {/* Development & Pull Requests Section */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <DevelopmentPanel
                  issue={issue}
                  isGuest={isGuest}
                  onIssueUpdated={(updatedIssue) => {
                    setData((prev) => ({
                      ...prev,
                      issue: { ...prev.issue, ...updatedIssue },
                    }));
                    window.dispatchEvent(
                      new CustomEvent("issue-updated-global", { detail: updatedIssue })
                    );
                  }}
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
              {/* Status: Editable by Manager, Read-only badge for Employee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                {isManager ? (
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
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <span className="font-semibold text-gray-800 dark:text-slate-200">
                      {issue.status}
                    </span>
                    <span
                      className="text-[10px] text-gray-400 dark:text-slate-400 flex items-center space-x-1"
                      title="Status automatically transitions to In Progress when you raise a PR"
                    >
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span>Transitions via PR</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Priority: Editable by Manager, Read-only badge for Employee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                {isManager ? (
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
                ) : (
                  <div
                    className={`w-full px-3 py-2 rounded-xl border dark:border-slate-700 font-semibold flex items-center space-x-2 ${
                      priorityColors[issue.priority] || "text-gray-800 dark:text-slate-200"
                    }`}
                  >
                    <span>{issue.priority}</span>
                  </div>
                )}
              </div>

              {/* Assignee: Editable by Manager, Read-only card for Employee */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    Assignee
                  </label>
                  {!isManager && (
                    <span
                      className="flex items-center space-x-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                      title="Only Project Managers can delegate or reassign tasks"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Manager only</span>
                    </span>
                  )}
                </div>

                {isManager ? (
                  <select
                    value={issue.assigneeId?._id || issue.assigneeId || ""}
                    onChange={(e) => handleFieldUpdate("assigneeId", e.target.value || null)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">Unassigned</option>
                    {eligibleAssignees.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.email ? `(${u.email})` : `(${u.role})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1.5">
                    {issue.assigneeId ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(
                              issue.assigneeId?.name ||
                              issue.assigneeId?.email ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-slate-200 truncate">
                            {issue.assigneeId?.name || issue.assigneeId?.email}
                          </span>
                        </div>
                        {((issue.assigneeId?._id || issue.assigneeId)?.toString() ===
                          (user?.userId || user?._id)?.toString()) && (
                          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-semibold shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-850 border border-dashed border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 text-xs">
                        Unassigned (Pending Manager)
                      </div>
                    )}
                  </div>
                )}
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

              {/* Sprint: Editable by Manager, Read-only for Employee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Sprint
                </label>
                {isManager ? (
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
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium">
                    {issue.sprintId?.name || "Backlog"}
                  </div>
                )}
              </div>

              {/* Story Points Estimate: Editable by Manager, Read-only for Employee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Story Points Estimate
                </label>
                {isManager ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={issue.estimate || ""}
                    onChange={(e) => handleFieldUpdate("estimate", Number(e.target.value) || 0)}
                    placeholder="e.g. 1, 2, 3, 5, 8"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-mono font-bold">
                    {issue.estimate > 0 ? `${issue.estimate} pts` : "None"}
                  </div>
                )}
              </div>

              {/* Due Date: Editable by Manager, Read-only for Employee */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Due Date
                </label>
                {isManager ? (
                  <input
                    type="date"
                    value={issue.dueDate ? moment(issue.dueDate).format("YYYY-MM-DD") : ""}
                    onChange={(e) => handleFieldUpdate("dueDate", e.target.value || null)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium">
                    {issue.dueDate ? moment(issue.dueDate).format("MMM DD, YYYY") : "No due date set"}
                  </div>
                )}
              </div>

              {/* Time Tracking Progress */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700 dark:text-slate-300">Time Logged</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {(data.totalMinutesLogged / 60).toFixed(1)}h
                  </span>
                </div>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => startTimer(issue)}
                    className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 font-semibold transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Start Stopwatch</span>
                  </button>
                )}
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

              {/* Delete Button: Only available to Project Managers */}
              {isManager && (
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
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default IssueDetailModal;
