import React, { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useApp } from "../context/AppContext";

const Settings = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const { theme, setTheme } = useApp();
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    currentPassword: "",
    newPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/user/update/${user.userId}`, formData);
      if (res.data.success) {
        toast.success("Profile updated successfully");
        const updatedUser = { ...user, name: res.data.name, email: res.data.email };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        if (res.data.token) {
          sessionStorage.setItem("token", res.data.token);
        }
        setFormData({ ...formData, currentPassword: "", newPassword: "" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Manage your account profile, theme preferences, and credentials
        </p>
      </div>

      {/* Appearance / Theme Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-gray-100 dark:border-slate-800 p-6 sm:p-8">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">Appearance</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Customize your interface theme. Choose between light and dark modes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
              theme === "light"
                ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-amber-500 shadow-2xs border border-gray-200/60 dark:border-slate-700 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Light Theme</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Clean, bright workspace</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
              theme === "dark"
                ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-400 shadow-2xs border border-gray-200/60 dark:border-slate-700 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-slate-100">Dark Theme</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">High contrast, easy on the eyes</p>
            </div>
          </button>
        </div>
      </div>
      
      {/* Profile Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-gray-100 dark:border-slate-800 p-6 sm:p-8">
        <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">User Profile & Password</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
          Update your personal details and authentication credentials
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">Update Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full pl-9 pr-11 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
                placeholder="Required for changing password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full pl-9 pr-11 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
                placeholder="Leave blank to keep current"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
