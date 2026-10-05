import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { FolderKanban, ChevronDown, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const ProjectSwitcher = () => {
  const { currentWorkspace, projects, currentProject, switchProject, fetchProjects } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
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

  const handleNameChange = (val) => {
    setName(val);
    if (!key || key.length <= 4) {
      const autoKey = val
        .trim()
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();
      if (autoKey) setKey(autoKey);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!currentWorkspace?._id || !name.trim() || !key.trim()) return;

    try {
      const res = await api.post("/v1/projects", {
        workspaceId: currentWorkspace._id,
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
      });

      if (res.data.success) {
        toast.success(`Project "${res.data.project.name}" (${res.data.project.key}) created!`);
        setName("");
        setKey("");
        setDescription("");
        setIsModalOpen(false);
        await fetchProjects(currentWorkspace._id);
        if (res.data.project) {
          switchProject(res.data.project);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
          {currentProject?.key ? currentProject.key.substring(0, 2) : "PR"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[130px] leading-tight">
            {currentProject?.name || "Select Project"}
          </p>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono font-semibold">
            {currentProject?.key || "KEY"}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Projects ({projects.length})
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 px-1">
            {projects.map((p) => {
              const isSelected = p._id === currentProject?._id;
              return (
                <div
                  key={p._id}
                  onClick={() => {
                    switchProject(p);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-medium"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                      {p.key}
                    </span>
                    <div className="truncate">
                      <p className="truncate text-xs font-medium dark:text-slate-200">{p.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">
                        {p.issueCount || 0} issue{p.issueCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-slate-800 mt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-transparent dark:border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Project</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile App, CRM Platform"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Project Key * (Prefix for issues like CRM-101)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. CRM, MOB, DEV"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 text-sm font-mono uppercase font-bold rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-all resize-none"
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSwitcher;
