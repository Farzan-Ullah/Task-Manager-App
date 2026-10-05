const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from server directory or fallback to cwd
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn("Warning: MONGODB_URI is not defined in environment variables");
} else {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("Database Connected!!");
    })
    .catch((error) => {
      console.log("Error connecting to database", error);
    });
}

module.exports = mongoose;
