import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";
import { getSocket, reconnectSocket, disconnectSocket } from "../utils/socket";
import { toast } from "sonner";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const sessionToken = sessionStorage.getItem("token");
      const localToken = localStorage.getItem("token");

      if (sessionToken) {
        const sessionUser = sessionStorage.getItem("user");
        if (sessionUser) return JSON.parse(sessionUser);
      } else if (localToken) {
        const localUser = localStorage.getItem("user");
        if (localUser) return JSON.parse(localUser);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global Modal Visibility
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Theme State: "light" | "dark" - isolated per tab/session via sessionStorage
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = sessionStorage.getItem("promanage_theme");
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

  // Apply theme class to document root for this tab
  useEffect(() => {
    try {
      sessionStorage.setItem("promanage_theme", theme);
      // Remove any legacy shared localStorage theme so it does not bleed across tabs
      localStorage.removeItem("promanage_theme");
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

  // Purge any legacy timer keys from storage
  useEffect(() => {
    try {
      localStorage.removeItem("promanage_active_timer");
      sessionStorage.removeItem("promanage_active_timer");
    } catch {
      // ignore
    }
  }, []);

  const timer = { active: false, seconds: 0 };
  const startTimer = () => {};
  const pauseTimer = () => {};
  const resetTimer = () => {};

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

  // Fetch Members for current workspace
  const fetchWorkspaceMembers = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setWorkspaceMembers([]);
      return;
    }

    try {
      const res = await api.get(`/v1/workspaces/${workspaceId}/members`);
      if (res.data.success && res.data.members) {
        setWorkspaceMembers(res.data.members);
      }
    } catch (err) {
      console.error("Failed to fetch workspace members:", err);
    }
  }, []);

  // Switch Workspace
  const switchWorkspace = async (workspace) => {
    setCurrentWorkspace(workspace);
    sessionStorage.setItem("activeWorkspaceId", workspace._id);
    localStorage.setItem("activeWorkspaceId", workspace._id);
    await Promise.all([
      fetchProjects(workspace._id),
      fetchWorkspaceMembers(workspace._id),
    ]);
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

  // Fetch latest authenticated user profile directly from server
  const fetchCurrentUser = useCallback(async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const res = await api.get("/user/me");
      if (res.data?.success && res.data?.user) {
        const freshUser = res.data.user;
        setUser(freshUser);
        sessionStorage.setItem("user", JSON.stringify(freshUser));
        if (localStorage.getItem("token")) {
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
        return freshUser;
      }
    } catch (err) {
      console.warn("User profile refresh:", err.response?.data?.message || err.message);
      if (err.response?.status === 401) {
        setUser(null);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return null;
  }, []);

  // Initial Load
  useEffect(() => {
    const sessionToken = sessionStorage.getItem("token");
    const localToken = localStorage.getItem("token");

    // Rehydrate sessionStorage if user has rememberMe token in localStorage
    if (!sessionToken && localToken) {
      sessionStorage.setItem("token", localToken);
      const localUser = localStorage.getItem("user");
      if (localUser) sessionStorage.setItem("user", localUser);
    }

    const token = sessionToken || localToken;
    if (token) {
      fetchCurrentUser();
      fetchWorkspaces();
      fetchNotifications();
    }
  }, [fetchCurrentUser, fetchWorkspaces, fetchNotifications]);

  // When workspace changes, fetch its projects and members
  useEffect(() => {
    if (currentWorkspace?._id) {
      fetchProjects(currentWorkspace._id);
      fetchWorkspaceMembers(currentWorkspace._id);
    }
  }, [currentWorkspace?._id, fetchProjects, fetchWorkspaceMembers]);

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

    const handleMemberUpdate = () => {
      if (currentWorkspace?._id) {
        fetchWorkspaceMembers(currentWorkspace._id);
      }
    };

    socket.on("notification.created", handleNotification);
    socket.on("member.added", handleMemberUpdate);
    socket.on("member.removed", handleMemberUpdate);
    socket.on("member.updated", handleMemberUpdate);

    return () => {
      socket.off("notification.created", handleNotification);
      socket.off("member.added", handleMemberUpdate);
      socket.off("member.removed", handleMemberUpdate);
      socket.off("member.updated", handleMemberUpdate);
    };
  }, [currentWorkspace?._id, currentProject?._id, currentBoard?._id, fetchWorkspaceMembers]);

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

  // Compute active user roles
  const currentUserId = user?.userId || user?._id;
  const userWorkspaceMember = workspaceMembers.find(
    (m) => String(m.userId?._id || m.userId || "") === String(currentUserId || "")
  );
  const userWorkspaceRole = userWorkspaceMember?.role || user?.role || "Member";

  const isGuest =
    user?.role === "Guest" ||
    userWorkspaceRole === "Guest" ||
    (currentWorkspace?.members &&
      currentWorkspace.members.some(
        (m) =>
          String(m.userId?._id || m.userId || "") === String(currentUserId || "") &&
          m.role === "Guest"
      ));

  const isOwner =
    currentWorkspace &&
    (String(currentWorkspace.owner?._id || currentWorkspace.owner || "") ===
      String(currentUserId || "") ||
      user?.role === "Admin");

  const isManager =
    !isGuest &&
    (isOwner ||
      userWorkspaceRole === "Workspace Admin" ||
      userWorkspaceRole === "Project Manager" ||
      (currentProject?.members &&
        currentProject.members.some(
          (m) =>
            String(m.userId?._id || m.userId || "") === String(currentUserId || "") &&
            (m.role === "Project Manager" || m.role === "Workspace Admin")
        )));

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        fetchCurrentUser,
        workspaces,
        currentWorkspace,
        workspaceMembers,
        fetchWorkspaceMembers,
        userWorkspaceRole,
        isGuest,
        isOwner,
        isManager,
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
