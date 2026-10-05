import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { Building2, ChevronDown, Check, Plus, Copy, Shield, X, Users } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const WorkspaceSwitcher = () => {
  const { workspaces, currentWorkspace, switchWorkspace, fetchWorkspaces } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyInviteCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success("Workspace invite code copied!");
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const res = await api.post("/v1/workspaces", { name: newWorkspaceName.trim() });
      if (res.data.success) {
        toast.success(`Workspace "${newWorkspaceName}" created!`);
        setNewWorkspaceName("");
        setIsModalOpen(false);
        await fetchWorkspaces();
        if (res.data.workspace) {
          switchWorkspace(res.data.workspace);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create workspace");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
          {currentWorkspace?.name ? currentWorkspace.name.charAt(0).toUpperCase() : "W"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[130px] leading-tight">
            {currentWorkspace?.name || "Select Workspace"}
          </p>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium capitalize">
            {currentWorkspace?.plan || "Free"} Plan
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Workspaces ({workspaces.length})
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 px-1">
            {workspaces.map((w) => {
              const isSelected = w._id === currentWorkspace?._id;
              return (
                <div
                  key={w._id}
                  onClick={() => {
                    switchWorkspace(w);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                      }`}
                    >
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-medium dark:text-slate-200">{w.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">
                        {w.members?.length || 1} member{w.members?.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {w.inviteCode && (
                      <button
                        title="Copy Invite Code"
                        onClick={(e) => handleCopyInviteCode(e, w.inviteCode)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-1" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-slate-800 mt-1 space-y-1">
            <Link
              to="/dash/members"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Workspace Members & Roles</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-transparent dark:border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Workspace</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp, Engineering"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
