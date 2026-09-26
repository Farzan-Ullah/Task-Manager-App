const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Employee"],
      default: "Employee",
    },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
