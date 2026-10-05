import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";
import { getSocket, reconnectSocket, disconnectSocket } from "../utils/socket";
import { toast } from "sonner";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("user") || "null") ||
        JSON.parse(localStorage.getItem("user") || "null")
      );
    } catch {
      return null;
    }
  });

  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global Modal Visibility
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Theme State: "light" | "dark"
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("promanage_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  // Apply theme class to document root
  useEffect(() => {
    try {
      localStorage.setItem("promanage_theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error("Theme toggle error:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Active Stopwatch / Time Tracker State
  const [timer, setTimer] = useState(() => {
    try {
      const saved = localStorage.getItem("promanage_active_timer");
      return saved ? JSON.parse(saved) : { active: false, seconds: 0, issueId: null, issueKey: "", issueTitle: "" };
    } catch {
      return { active: false, seconds: 0, issueId: null, issueKey: "", issueTitle: "" };
    }
  });

  const timerIntervalRef = useRef(null);

  // Synchronize timer to localStorage and handle interval
  useEffect(() => {
    localStorage.setItem("promanage_active_timer", JSON.stringify(timer));

    if (timer.active) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timer.active]);

  const startTimer = (issue = null) => {
    setTimer((prev) => ({
      active: true,
      seconds: prev.seconds,
      issueId: issue?._id || prev.issueId,
      issueKey: issue?.key || prev.issueKey,
      issueTitle: issue?.title || prev.issueTitle,
    }));
    toast.info("Timer started");
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, active: false }));
    toast.info("Timer paused");
  };

  const resetTimer = () => {
    setTimer({ active: false, seconds: 0, issueId: null, issueKey: "", issueTitle: "" });
  };

  // Fetch Workspaces
  const fetchWorkspaces = useCallback(async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.get("/v1/workspaces");
      if (res.data.success && res.data.workspaces) {
        setWorkspaces(res.data.workspaces);

        const savedWkspId =
          sessionStorage.getItem("activeWorkspaceId") ||
          localStorage.getItem("activeWorkspaceId");
        let active = res.data.workspaces.find((w) => w._id === savedWkspId);
        if (!active && res.data.workspaces.length > 0) {
          active = res.data.workspaces[0];
        }

        if (active) {
          setCurrentWorkspace(active);
          sessionStorage.setItem("activeWorkspaceId", active._id);
          localStorage.setItem("activeWorkspaceId", active._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    }
  }, []);

  // Fetch Projects for current workspace
  const fetchProjects = useCallback(async (workspaceId) => {
    if (!workspaceId) return;

    try {
      const res = await api.get(`/v1/projects?workspaceId=${workspaceId}`);
      if (res.data.success && res.data.projects) {
        setProjects(res.data.projects);

        const savedProjId =
          sessionStorage.getItem("activeProjectId") ||
          localStorage.getItem("activeProjectId");
        let active = res.data.projects.find((p) => p._id === savedProjId);
        if (!active && res.data.projects.length > 0) {
          active = res.data.projects[0];
        }

        if (active) {
          setCurrentProject(active);
          sessionStorage.setItem("activeProjectId", active._id);
          localStorage.setItem("activeProjectId", active._id);
        } else {
          setCurrentProject(null);
          setCurrentBoard(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }, []);

  // Fetch Board for current project
  const fetchBoard = useCallback(async (projectId) => {
    if (!projectId) return;

    try {
      const res = await api.get(`/v1/projects/${projectId}/board`);
      if (res.data.success && res.data.board) {
        setCurrentBoard(res.data.board);
      }
    } catch (err) {
      console.error("Failed to fetch project board:", err);
    }
  }, []);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.get("/v1/notifications");
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  // Switch Workspace
  const switchWorkspace = async (workspace) => {
    setCurrentWorkspace(workspace);
    sessionStorage.setItem("activeWorkspaceId", workspace._id);
    localStorage.setItem("activeWorkspaceId", workspace._id);
    await fetchProjects(workspace._id);
    toast.success(`Switched to workspace: ${workspace.name}`);
  };

  // Switch Project
  const switchProject = (project) => {
    setCurrentProject(project);
    sessionStorage.setItem("activeProjectId", project._id);
    localStorage.setItem("activeProjectId", project._id);
    fetchBoard(project._id);
    toast.success(`Switched to project: ${project.name}`);
  };

  // Mark single notification as read
  const markNotificationAsRead = async (notifId) => {
    try {
      await api.patch(`/v1/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await api.patch("/v1/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Initial Load
  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      fetchWorkspaces();
      fetchNotifications();
    }
  }, [fetchWorkspaces, fetchNotifications]);

  // When workspace changes, fetch its projects
  useEffect(() => {
    if (currentWorkspace?._id) {
      fetchProjects(currentWorkspace._id);
    }
  }, [currentWorkspace?._id, fetchProjects]);

  // When project changes, fetch its board
  useEffect(() => {
    if (currentProject?._id) {
      fetchBoard(currentProject._id);
    }
  }, [currentProject?._id, fetchBoard]);

  // Socket.IO Room Subscriptions & Event Handlers
  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    const socket = getSocket();

    if (currentWorkspace?._id) {
      socket.emit("join:workspace", currentWorkspace._id);
    }
    if (currentProject?._id) {
      socket.emit("join:project", currentProject._id);
    }
    if (currentBoard?._id) {
      socket.emit("join:board", currentBoard._id);
    }

    // In-App Notification Push Listener
    const handleNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast(newNotif.title, {
        description: newNotif.message,
      });
    };

    socket.on("notification.created", handleNotification);

    return () => {
      socket.off("notification.created", handleNotification);
    };
  }, [currentWorkspace?._id, currentProject?._id, currentBoard?._id]);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K for Search, C for Create Issue)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        workspaces,
        currentWorkspace,
        switchWorkspace,
        fetchWorkspaces,
        projects,
        currentProject,
        switchProject,
        fetchProjects,
        currentBoard,
        fetchBoard,
        notifications,
        unreadCount,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        timer,
        startTimer,
        pauseTimer,
        resetTimer,
        isCreateIssueOpen,
        setIsCreateIssueOpen,
        isSearchOpen,
        setIsSearchOpen,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
