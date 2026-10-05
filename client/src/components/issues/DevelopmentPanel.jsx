import React, { useState } from "react";
import {
  GitPullRequest,
  GitBranch,
  GitMerge,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import api from "../../utils/api";

const slugify = (text = "") => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .slice(0, 30);
};

const DevelopmentPanel = ({ issue, onIssueUpdated, isGuest = false }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suggestedBranch = `feature/${(issue?.key || "task").toLowerCase()}-${slugify(
    issue?.title || "work"
  )}`;
  const gitBranchCommand = `git checkout -b ${suggestedBranch}`;

  // Form states
  const [prTitle, setPrTitle] = useState(`${issue?.key || "TASK"}: ${issue?.title || ""}`);
  const [prUrl, setPrUrl] = useState("");
  const [branch, setBranch] = useState(suggestedBranch);
  const [targetBranch, setTargetBranch] = useState("main");
  const [notes, setNotes] = useState("");

  const handleCopyBranch = () => {
    navigator.clipboard.writeText(gitBranchCommand);
    setCopiedBranch(true);
    toast.success("Branch command copied to clipboard!");
    setTimeout(() => setCopiedBranch(false), 2000);
  };

  const handleRaisePR = async (e) => {
    e.preventDefault();
    if (!prTitle.trim() || !prUrl.trim()) {
      toast.error("Please provide both a PR title and valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/v1/issues/${issue._id}/pull-requests`, {
        title: prTitle.trim(),
        url: prUrl.trim(),
        branch: branch.trim() || suggestedBranch,
        targetBranch: targetBranch.trim() || "main",
        notes: notes.trim(),
      });

      if (res.data.success) {
        toast.success(res.data.message || "Pull request linked successfully!");
        setShowAddForm(false);
        setPrUrl("");
        setNotes("");
        if (onIssueUpdated) {
          onIssueUpdated(res.data.issue);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise pull request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (prId, newStatus) => {
    try {
      const res = await api.patch(
        `/v1/issues/${issue._id}/pull-requests/${prId}`,
        { status: newStatus }
      );
      if (res.data.success) {
        toast.success(`PR marked as ${newStatus}`);
        if (onIssueUpdated) {
          onIssueUpdated(res.data.issue);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update PR status");
    }
  };

  const handleDeletePR = async (prId, prName) => {
    if (!confirm(`Are you sure you want to unlink PR "${prName}"?`)) return;
    try {
      const res = await api.delete(
        `/v1/issues/${issue._id}/pull-requests/${prId}`
      );
      if (res.data.success) {
        toast.success("Pull request unlinked");
        if (onIssueUpdated) {
          onIssueUpdated(res.data.issue);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlink PR");
    }
  };

  const pullRequests = issue?.pullRequests || [];

  return (
    <div className="space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Development & PRs</span>
              {pullRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                  {pullRequests.length}
                </span>
              )}
            </h4>
          </div>
        </div>

        {!isGuest && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg transition-colors border border-purple-200/60 dark:border-purple-800/60"
          >
            {showAddForm ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Raise PR</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Suggested Branch & Quick Copy */}
      <div className="p-3 bg-gray-50 dark:bg-slate-950/60 border border-gray-200/80 dark:border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 font-medium">
          <span className="flex items-center space-x-1.5">
            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
            <span>Recommended Git Branch:</span>
          </span>
          <button
            type="button"
            onClick={handleCopyBranch}
            className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold"
            title="Copy git checkout command"
          >
            {copiedBranch ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>
        <div className="font-mono text-xs text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700/80 select-all overflow-x-auto">
          {gitBranchCommand}
        </div>
      </div>

      {/* Raise PR Form Modal / Expander */}
      {showAddForm && (
        <form
          onSubmit={handleRaisePR}
          className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-purple-900/60">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center space-x-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Raise & Link Pull Request</span>
            </span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              Auto-moves task to &quot;In Progress&quot;
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
              PR Title *
            </label>
            <input
              type="text"
              required
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="e.g. feat: implement auth token refreshing"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Pull Request URL * (GitHub, GitLab, Bitbucket)
            </label>
            <input
              type="url"
              required
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/123"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Source Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. feature/PROJ-1-login"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Target Branch
              </label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Notes for Reviewer (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needs migration check before merging"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>{submitting ? "Linking PR..." : "Submit Pull Request"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Linked PRs List */}
      {pullRequests.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-slate-500">
          <p>No pull requests linked to this task yet.</p>
          <p className="text-[11px] text-gray-400/80 mt-1">
            Employees can raise a PR to start work and track reviews against Jira task {issue?.key}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pullRequests.map((pr) => {
            const isMerged = pr.status === "MERGED";
            const isClosed = pr.status === "CLOSED";
            const isOpen = pr.status === "OPEN" || !pr.status;

            return (
              <div
                key={pr._id}
                className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-2xs space-y-2 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
              >
                {/* PR Header: Status Badge + Title + External Link */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {/* Status Pill */}
                    {isMerged ? (
                      <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <GitMerge className="w-3 h-3" />
                        <span>MERGED</span>
                      </span>
                    ) : isClosed ? (
                      <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span>CLOSED</span>
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>OPEN</span>
                      </span>
                    )}

                    {/* PR Title */}
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex items-center space-x-1"
                      title={pr.title}
                    >
                      <span>{pr.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-gray-400 group-hover:text-indigo-500" />
                    </a>
                  </div>

                  {/* Unlink Action - Hidden for Guests */}
                  {!isGuest && (
                    <button
                      type="button"
                      onClick={() => handleDeletePR(pr._id, pr.title)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-slate-800 shrink-0"
                      title="Unlink Pull Request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch route and Author */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 gap-1.5 pt-1 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center space-x-1 font-mono text-[10px]">
                    <GitBranch className="w-3 h-3 text-gray-400" />
                    <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-gray-700 dark:text-slate-300">
                      {pr.branch || "source"}
                    </span>
                    <span>→</span>
                    <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-gray-700 dark:text-slate-300">
                      {pr.targetBranch || "main"}
                    </span>
                  </div>

                  <div className="text-[10px]">
                    <span>Raised by </span>
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      {pr.authorName || "Employee"}
                    </span>
                    <span> • {moment(pr.createdAt).fromNow()}</span>
                    {isMerged && pr.mergedAt && (
                      <span className="text-purple-600 dark:text-purple-400 font-semibold ml-1">
                        (Merged {moment(pr.mergedAt).fromNow()})
                      </span>
                    )}
                  </div>
                </div>

                {pr.notes && (
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded border border-gray-100 dark:border-slate-800 italic">
                    &quot;{pr.notes}&quot;
                  </p>
                )}

                {/* State Transition Actions - Hidden for Guests */}
                {!isGuest && (
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    {isOpen && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(pr._id, "MERGED")}
                          className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg transition-colors border border-purple-200/80 dark:border-purple-800/80"
                        >
                          <CheckCircle2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>Mark as Merged</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(pr._id, "CLOSED")}
                          className="px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          Close PR
                        </button>
                      </>
                    )}
                    {isClosed && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(pr._id, "OPEN")}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors"
                      >
                        Reopen PR
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DevelopmentPanel;
