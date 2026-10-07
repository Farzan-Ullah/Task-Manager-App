const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from server directory or fallback to cwd
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("Warning: MONGODB_URI is not defined in environment variables");
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose
      .connect(mongoUri, opts)
      .then((m) => {
        console.log("Database Connected successfully!!");
        return m;
      })
      .catch((error) => {
        console.error("Error connecting to database:", error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Immediate connect attempt for non-serverless runtime
connectDB().catch((err) => {
  console.warn("Initial DB connection warning:", err.message);
});

module.exports = mongoose;
module.exports.connectDB = connectDB;
