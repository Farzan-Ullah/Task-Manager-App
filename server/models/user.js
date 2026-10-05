const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["Admin", "Employee", "Workspace Admin", "Project Manager", "Member", "Guest"],
      default: "Employee",
    },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    workspaces: [
      {
        workspaceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workspace",
          required: true,
        },
        role: {
          type: String,
          enum: ["Workspace Admin", "Project Manager", "Member", "Guest"],
          default: "Member",
        },
      },
    ],
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ workspace: 1 });
userSchema.index({ "workspaces.workspaceId": 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
