const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Initialize Socket.IO with the HTTP Server
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allows Vite client dev server and production clients
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers["authorization"];

      if (authHeader) {
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : authHeader;

        if (token && process.env.SECRET_KEY) {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          socket.user = decoded;
        }
      }
      return next();
    } catch (err) {
      console.warn("Socket handshake warning (unauthenticated guest allowed):", err.message);
      // Allow connection but without authenticated user
      return next();
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId || "Guest"})`);

    // Automatically join personal user room if authenticated
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Room subscription handlers
    socket.on("join:workspace", (workspaceId) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
        console.log(`Socket ${socket.id} joined workspace:${workspaceId}`);
      }
    });

    socket.on("leave:workspace", (workspaceId) => {
      if (workspaceId) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });

    socket.on("join:project", (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
        console.log(`Socket ${socket.id} joined project:${projectId}`);
      }
    });

    socket.on("leave:project", (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on("join:board", (boardId) => {
      if (boardId) {
        socket.join(`board:${boardId}`);
        console.log(`Socket ${socket.id} joined board:${boardId}`);
      }
    });

    socket.on("leave:board", (boardId) => {
      if (boardId) {
        socket.leave(`board:${boardId}`);
      }
    });

    socket.on("join:issue", (issueId) => {
      if (issueId) {
        socket.join(`issue:${issueId}`);
        console.log(`Socket ${socket.id} joined issue:${issueId}`);
      }
    });

    socket.on("leave:issue", (issueId) => {
      if (issueId) {
        socket.leave(`issue:${issueId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
}

/**
 * Retrieve current Socket.IO instance
 * @returns {Server|null}
 */
function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
