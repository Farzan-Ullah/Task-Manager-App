const path = require("path");
const dotenv = require("dotenv");
// Ensure .env is loaded before other imports
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const express = require("express");
const http = require("http");
const cors = require("cors");

const userRoutes = require("./routes/user");
const todoRoutes = require("./routes/todo");
const apiV1Routes = require("./routes/v1");
const { verifyToken } = require("./middlewares/TokenVerification");
const errorHandler = require("./middlewares/errorHandler");
const ShareTodo = require("./controllers/todos/TodoShare");
const { initSocket } = require("./sockets");
const { connectDB } = require("./config/db");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.io = io;
app.server = server;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Database connection middleware for serverless cold-starts & connection reuse
app.use(async (req, res, next) => {
  try {
    if (connectDB) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error("Database connection middleware error:", err.message);
    return res.status(500).json({
      errorMessage: "Database connection failed. Please ensure MONGODB_URI is set in Vercel environment variables and MongoDB Atlas IP access allows 0.0.0.0/0.",
      details: err.message,
    });
  }
});

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const port = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World! Pro Manage API v1 with Socket.IO ready." });
});

// Upgraded API v1 routes
app.use("/api/v1", apiV1Routes);

// Legacy routes preserved for 100% backward compatibility
app.use("/api/user", userRoutes);
app.use("/api/todos", verifyToken, todoRoutes);
app.use("/user", userRoutes);
app.use("/todos", verifyToken, todoRoutes);
app.use("/share/:id", ShareTodo);
app.use("/api/share/:id", ShareTodo);

// Centralized error handling middleware
app.use(errorHandler);

// Only listen if executed directly
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server is running on ${port} with Socket.IO enabled`);
  });
}

module.exports = app;
