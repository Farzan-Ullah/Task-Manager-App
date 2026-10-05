import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../utils/api";
import { Mail, Shield, ArrowRight, ArrowLeft, CheckCircle2, Copy, ExternalLink, Sparkles } from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { resetToken, resetUrl, email }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await api.post("/user/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      if (res.data.success) {
        setResult({
          resetToken: res.data.resetToken,
          resetUrl: res.data.resetUrl,
          email: res.data.email || email,
        });
        toast.success("Password reset instructions generated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.errorMessage || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.resetUrl) {
      navigator.clipboard.writeText(result.resetUrl);
      toast.success("Reset link copied to clipboard!");
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
            Account Recovery
          </h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed">
            Secure, end-to-end credential restoration. Reset your password and get right back to managing your projects.
          </p>
        </div>

        {/* Decorative blur orbs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500 blur-3xl opacity-40 mix-blend-screen animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500 blur-3xl opacity-30 mix-blend-screen"
          style={{ animationDelay: "1s" }}
        ></div>
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
          {result ? (
            /* Success State */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                  Reset link generated
                </h2>
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  We've created a secure password reset link for{" "}
                  <strong className="text-gray-800 dark:text-slate-200">{result.email}</strong>. The link is valid for 1 hour.
                </p>
              </div>

              {/* Direct Access Action Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Instant Reset Access</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-slate-400">
                  You can proceed directly to create your new password, or copy the link to open in another browser.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/reset-password/${result.resetToken}`)}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <span>Proceed to Reset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                  Use a different email address
                </button>
                <div>
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Input Form State */
            <div>
              <div className="mb-8 text-center lg:text-left mt-8 lg:mt-0">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                  Forgot password?
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  No worries! Enter your registered email address and we'll generate password reset instructions for you.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Email address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-14 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 items-center group cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Generating reset link..." : "Send Reset Instructions"}
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span>Back to sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
