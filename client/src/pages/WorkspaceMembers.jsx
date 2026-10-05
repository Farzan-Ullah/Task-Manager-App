import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  Briefcase,
  User,
  Eye,
  Search,
  Trash2,
  Mail,
  Building2,
  Sparkles,
  ExternalLink,
  X,
  AlertCircle,
} from "lucide-react";

const ROLE_BADGES = {
  "Workspace Admin": {
    label: "Workspace Admin",
    color: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Shield,
  },
  "Project Manager": {
    label: "Project Manager",
    color: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Briefcase,
  },
  Member: {
    label: "Member",
    color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: User,
  },
  Guest: {
    label: "Guest (Stakeholder)",
    color: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    icon: Eye,
  },
};

const WorkspaceMembers = () => {
  const { currentWorkspace, user, workspaceMembers, fetchWorkspaceMembers, userWorkspaceRole } = useApp();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviting, setInviting] = useState(false);

  // Load members whenever workspace changes
  useEffect(() => {
    if (!currentWorkspace?._id) return;

    const loadMembers = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/v1/workspaces/${currentWorkspace._id}/members`);
        if (res.data.success && res.data.members) {
          setMembers(res.data.members);
        }
      } catch (err) {
        console.error("Failed to load workspace members:", err);
        // Fallback to context
        if (workspaceMembers && workspaceMembers.length > 0) {
          setMembers(workspaceMembers);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [currentWorkspace?._id, workspaceMembers]);

  // Determine if the logged-in user can manage members and assign roles (only Workspace Owner or Workspace Admin)
  // Project Managers, normal Employees/Members, and Guests cannot select roles or manage members
  const isWorkspaceAdmin = useMemo(() => {
    if (!user) return false;

    const currentUserId = (user._id || user.userId)?.toString();
    if (!currentUserId) return false;

    // Check if the current user is the workspace owner
    const ownerId = (currentWorkspace?.owner?._id || currentWorkspace?.owner)?.toString();
    const isOwner = Boolean(ownerId && ownerId === currentUserId);
    if (isOwner) return true;

    // Find the current user's membership in this workspace
    const currentMember = members.find((m) => {
      const mId = (m._id || m.userId?._id || m.userId)?.toString();
      return mId === currentUserId;
    });

    const effectiveRole = currentMember?.role || userWorkspaceRole || user.role;

    // Prevent Project Managers, Members, Guests, and Employees from selecting user roles or managing workspace
    if (
      effectiveRole === "Project Manager" ||
      effectiveRole === "Member" ||
      effectiveRole === "Guest" ||
      effectiveRole === "Employee" ||
      user?.role === "Project Manager" ||
      user?.role === "Guest" ||
      user?.role === "Member" ||
      user?.role === "Employee"
    ) {
      return false;
    }

    return effectiveRole === "Workspace Admin";
  }, [user, userWorkspaceRole, currentWorkspace, members]);

  // Copy workspace invite code
  const handleCopyCode = () => {
    if (!currentWorkspace?.inviteCode) return;
    navigator.clipboard.writeText(currentWorkspace.inviteCode);
    setCopiedCode(true);
    toast.success("Invite code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy direct registration link with invite code
  const handleCopyLink = () => {
    if (!currentWorkspace?.inviteCode) return;
    const link = `${window.location.origin}/?invite=${currentWorkspace.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Direct registration link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Invite member by email
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!isWorkspaceAdmin) {
      toast.error("Only Workspace Admins or the Workspace Owner can invite team members");
      return;
    }
    if (!inviteEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const res = await api.post(`/v1/workspaces/${currentWorkspace._id}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res.data.success) {
        toast.success(res.data.message || "Member added successfully");
        setIsInviteModalOpen(false);
        setInviteEmail("");
        setInviteRole("Member");
        await fetchWorkspaceMembers(currentWorkspace._id);
        const updatedRes = await api.get(`/v1/workspaces/${currentWorkspace._id}/members`);
        if (updatedRes.data.success) {
          setMembers(updatedRes.data.members || []);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  // Update member role
  const handleRoleChange = async (memberId, newRole) => {
    if (!isWorkspaceAdmin) {
      toast.error("Only Workspace Admins or the Workspace Owner can change roles");
      return;
    }
    try {
      const res = await api.patch(
        `/v1/workspaces/${currentWorkspace._id}/members/${memberId}/role`,
        { role: newRole }
      );
      if (res.data.success) {
        toast.success("Member role updated");
        setMembers((prev) =>
          prev.map((m) => (m._id === memberId ? { ...m, role: newRole } : m))
        );
        fetchWorkspaceMembers(currentWorkspace._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  // Remove member
  const handleRemoveMember = async (member) => {
    if (!isWorkspaceAdmin) {
      toast.error("Only Workspace Admins or the Workspace Owner can remove members");
      return;
    }
    if (member._id === currentWorkspace?.owner || member._id === currentWorkspace?.owner?._id) {
      toast.error("Cannot remove workspace owner");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove ${member.name} (${member.email}) from this workspace?`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(
        `/v1/workspaces/${currentWorkspace._id}/members/${member._id}`
      );
      if (res.data.success) {
        toast.success("Member removed from workspace");
        setMembers((prev) => prev.filter((m) => m._id !== member._id));
        fetchWorkspaceMembers(currentWorkspace._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === "ALL" || m.role === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, selectedRoleFilter]);

  // Color generator for avatar initials
  const getAvatarBg = (name) => {
    const colors = [
      "bg-indigo-600 text-white",
      "bg-emerald-600 text-white",
      "bg-purple-600 text-white",
      "bg-rose-600 text-white",
      "bg-blue-600 text-white",
      "bg-amber-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                {currentWorkspace?.name || "Workspace"} Members
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700">
                  {members.length} {members.length === 1 ? "Employee" : "Employees"}
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {isWorkspaceAdmin
                  ? "Manage team members, roles, permissions, and invite new employees to collaborate"
                  : "View team members and roles in this workspace"}
              </p>
            </div>
          </div>
        </div>

        {isWorkspaceAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Invite Code & Registration Share Card */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-950/30 dark:via-purple-950/20 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-600 text-white">
                Workspace Invite Code
              </span>
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                Plan: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentWorkspace?.plan || "Pro"}</span>
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100">
              Onboard Employees & Teammates Instantly
            </h2>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              When new employees register, they can enter this code in the <strong>Workspace Code</strong> field.
              They will automatically join this workspace and appear in the <strong>Assignee dropdown</strong> across all projects and tasks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Code Box */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xs">
              <span className="font-mono text-sm sm:text-base font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 mr-3">
                {currentWorkspace?.inviteCode || "--------"}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Signup Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Role Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            {["ALL", "Workspace Admin", "Project Manager", "Member", "Guest"].map((r) => {
              const count =
                r === "ALL"
                  ? members.length
                  : members.filter((m) => m.role === r).length;

              return (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedRoleFilter === r
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {r === "ALL" ? "All Roles" : r} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Members List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 dark:text-slate-400">
            Loading workspace employees and members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
              No team members found
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No members match "${searchQuery}". Try clearing your search query.`
                : "Share your workspace invite code to start adding colleagues to your workspace."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Employee / Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden md:table-cell">Joined Date</th>
                  {isWorkspaceAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {filteredMembers.map((member) => {
                  const badgeInfo = ROLE_BADGES[member.role] || ROLE_BADGES.Member;
                  const Icon = badgeInfo.icon;
                  const isOwner =
                    currentWorkspace?.owner === member._id ||
                    currentWorkspace?.owner?._id === member._id;
                  const isCurrentLoggedUser =
                    user?._id === member._id || user?.userId === member._id;

                  return (
                    <tr
                      key={member._id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Name & Email & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-9 h-9 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarBg(
                                member.name
                              )}`}
                            >
                              {(member.name || member.email || "U").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 dark:text-slate-100 truncate">
                                {member.name}
                              </span>
                              {isOwner && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Owner
                                </span>
                              )}
                              {isCurrentLoggedUser && (
                                <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {isWorkspaceAdmin && !isOwner ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member._id, e.target.value)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="Workspace Admin">Workspace Admin</option>
                            <option value="Project Manager">Project Manager</option>
                            <option value="Member">Member</option>
                            <option value="Guest">Guest</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeInfo.color}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{badgeInfo.label}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-gray-500 dark:text-slate-400">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Recently"}
                      </td>

                      {/* Actions */}
                      {isWorkspaceAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          {!isOwner && (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  Invite Teammate to Workspace
                </h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Teammate Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  User must already be registered in the system, or can register using your invite code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Assign Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="Member">Member (Standard Employee)</option>
                  <option value="Project Manager">Project Manager (Can manage sprints & issues)</option>
                  <option value="Workspace Admin">Workspace Admin (Full workspace permissions)</option>
                  <option value="Guest">Guest (Read-only observer)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {inviting ? "Adding..." : "Add to Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceMembers;
