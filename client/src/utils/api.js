import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD ? "/api" : "http://localhost:5001/api",
});

api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    const activeWorkspaceId =
      sessionStorage.getItem("activeWorkspaceId") ||
      localStorage.getItem("activeWorkspaceId");

    if (activeWorkspaceId) {
      config.headers["x-workspace-id"] = activeWorkspaceId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
