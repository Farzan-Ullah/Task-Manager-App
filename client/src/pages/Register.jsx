import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../utils/api";
import { User, Lock, Mail, Shield, ArrowRight } from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isGuest, setIsGuest] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: searchParams.get("invite") ? searchParams.get("invite").toUpperCase() : "",
  });

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setFormData((prev) => ({ ...prev, inviteCode: invite.toUpperCase() }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const res = await api.post("/user/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
        isGuest: isGuest,
        role: isGuest ? "Guest" : undefined,
      });
      if (res.data.success) {
        toast.success(
          isGuest
            ? "Registered as Guest Stakeholder! Please login."
            : "Registration successful! Please login."
        );
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.errorMessage || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-950">
      {/* Left Section - Hero/Visuals */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-800 items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 px-12 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform -rotate-6 border border-white/20 transition-transform hover:scale-105">
            <Shield className="text-white h-12 w-12 transform rotate-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg leading-tight">
            Join Pro Manage
          </h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed">
            The all-in-one productivity tool designed to help you and your team achieve more. Sign up today and transform how you work.
          </p>
        </div>
        
        {/* Decorative blur orbs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500 blur-3xl opacity-40 mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500 blur-3xl opacity-30 mix-blend-screen" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Right Section - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white dark:bg-slate-950 relative">
        {/* Top Header Theme Switcher */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="absolute top-6 left-6 lg:hidden">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Shield className="text-white h-6 w-6 transform rotate-6" />
          </div>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="mb-10 text-center lg:text-left mt-8 lg:mt-0">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Get started by filling out your details below.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-12 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Email address</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-12 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Invite Code (Optional)</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input
                  name="inviteCode"
                  type="text"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-12 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                  placeholder="Enter invite code to join a workspace"
                />
              </div>

              {formData.inviteCode && (
                <div className="mt-2.5 p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-start space-x-2.5">
                  <input
                    id="isGuestToggle"
                    type="checkbox"
                    checked={isGuest}
                    onChange={(e) => setIsGuest(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="isGuestToggle" className="text-xs text-sky-900 dark:text-sky-200 cursor-pointer select-none">
                    <span className="font-semibold block">Join as Guest / External Stakeholder</span>
                    <span className="text-[11px] text-sky-700/80 dark:text-sky-300/80 block mt-0.5">
                      Stakeholder view-and-comment access only. Task creation, status dragging, and sprint management are restricted.
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-12 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Confirm</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-12 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 items-center group cursor-pointer"
              >
                Sign up
                <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-indigo-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-right hover:after:origin-left">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
