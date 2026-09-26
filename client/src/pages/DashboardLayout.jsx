import React, { useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, PieChart, LogOut, Shield } from "lucide-react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import api from "../utils/api";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout");
      Cookies.remove("token");
      localStorage.removeItem("user");
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = [
    { name: "Board", path: "/dash/board", icon: LayoutDashboard },
    { name: "Analytics", path: "/dash/analytics", icon: PieChart },
    { name: "Settings", path: "/dash/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 flex items-center space-x-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center transform -rotate-6">
              <Shield className="text-white h-6 w-6 transform rotate-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">Pro Manage</span>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold uppercase">
              {user.name ? user.name.charAt(0) : "U"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="text-indigo-600 h-6 w-6" />
            <span className="text-lg font-bold text-gray-900">Pro Manage</span>
          </div>
          <button onClick={handleLogout} className="text-red-600 p-2">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white border-b border-gray-200 flex overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 flex justify-center py-4 text-sm font-medium border-b-2 ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          ))}
        </nav>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
