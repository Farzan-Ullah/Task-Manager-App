import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../utils/api";
import Cookies from "js-cookie";
import { Mail, Lock, Shield, ArrowRight } from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

const Login = () => {
  const navigate = useNavigate();
  const rememberedEmail = localStorage.getItem("promanage_remember_email") || "";
  const [formData, setFormData] = useState({
    email: rememberedEmail,
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/user/login", formData);
      if (res.data.success) {
        const userData = {
          name: res.data.name,
          email: res.data.email,
          userId: res.data.userId,
          role: res.data.role || "Employee",
        };

        if (rememberMe) {
          localStorage.setItem("promanage_remember_email", formData.email);
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          localStorage.removeItem("promanage_remember_email");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }

        sessionStorage.setItem("token", res.data.token);
        sessionStorage.setItem("user", JSON.stringify(userData));

        toast.success("Welcome back!");
        navigate("/dash/board");
      }
    } catch (error) {
      toast.error(error.response?.data?.errorMessage || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white dark:bg-slate-950">
      {/* Left Section - Hero/Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-800 items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 px-12 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform -rotate-6 border border-white/20 transition-transform hover:scale-105">
            <Shield className="text-white h-12 w-12 transform rotate-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg leading-tight">
            Manage Tasks. <br /> Master Time.
          </h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed">
            Streamline your workflow and achieve your goals with Pro Manage. The ultimate workspace for teams and individuals.
          </p>
        </div>
        
        {/* Decorative blur orbs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500 blur-3xl opacity-40 mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500 blur-3xl opacity-30 mix-blend-screen" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Right Section - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white dark:bg-slate-950 relative">
        {/* Top Floating Controls */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle variant="icon" />
        </div>

        <div className="absolute top-6 left-6 lg:hidden">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Shield className="text-white h-6 w-6 transform rotate-6" />
          </div>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="mb-10 text-center lg:text-left mt-8 lg:mt-0">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Please enter your details to sign in.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Email address</label>
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
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-14 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Password</label>
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
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-14 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded cursor-pointer transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 items-center group cursor-pointer disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Don't have an account?{" "}
              <Link to="/" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-indigo-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-right hover:after:origin-left">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
