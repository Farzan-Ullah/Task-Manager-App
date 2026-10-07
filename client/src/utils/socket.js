import { io } from "socket.io-client";

let socket = null;

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : "http://localhost:5001";

/**
 * Initialize and get the Socket.IO client instance
 * @returns {import("socket.io-client").Socket}
 */
export function getSocket() {
  if (!socket) {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected to server:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection warning:", err.message);
    });
  }
  return socket;
}

/**
 * Re-connect socket with a new or refreshed JWT token
 * @param {string} token
 */
export function reconnectSocket(token) {
  if (socket) {
    socket.auth = { token };
    socket.disconnect().connect();
  } else {
    getSocket();
  }
}

/**
 * Disconnect and destroy the current socket instance
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
