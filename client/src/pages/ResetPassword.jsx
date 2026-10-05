import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../utils/api";
import { Lock, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    api
      .get(`/user/verify-reset-token/${token}`)
      .then((res) => {
        if (res.data.success) {
          setTokenValid(true);
          setUserEmail(res.data.email || "");
        }
      })
      .catch((err) => {
        console.error("Token verification failed:", err);
        setTokenValid(false);
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/user/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      if (res.data.success) {
        setResetSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      toast.error(err.response?.data?.errorMessage || "Failed to reset password");
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
            Create New Password
          </h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed">
            Ensure your account is protected with a strong, secure passphrase.
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
          {verifying ? (
            /* Loading State */
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Verifying password reset security token...
              </p>
            </div>
          ) : !tokenValid ? (
            /* Invalid / Expired Token State */
            <div className="text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-2 border border-red-100 dark:border-red-900/50 shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                Reset link invalid or expired
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                This password reset link is invalid, has expired, or has already been used. Please request a new one.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Request a new reset link</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : resetSuccess ? (
            /* Success State */
            <div className="text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                Password reset complete!
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Your password has been successfully updated. Redirecting to sign in page in 3 seconds...
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Reset Form */
            <div>
              <div className="mb-8 text-center lg:text-left mt-8 lg:mt-0">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                  Reset password
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  {userEmail ? (
                    <>
                      Updating password for{" "}
                      <strong className="text-gray-800 dark:text-slate-200">{userEmail}</strong>
                    </>
                  ) : (
                    "Please enter your new password below."
                  )}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* New Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 pr-12 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-14 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                    </div>
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 pr-12 sm:text-sm border-gray-200 dark:border-slate-800 rounded-xl h-14 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-850"
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password match feedback */}
                {password && confirmPassword && (
                  <p
                    className={`text-[11px] font-semibold flex items-center space-x-1 ${
                      password === confirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    <span>{password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}</span>
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 items-center group cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Updating password..." : "Reset Password"}
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

export default ResetPassword;
