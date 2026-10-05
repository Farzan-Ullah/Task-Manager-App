const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "ASSIGNMENT",
        "MENTION",
        "COMMENT",
        "STATUS_CHANGE",
        "SPRINT_START",
        "SPRINT_COMPLETE",
        "AUTOMATION",
        "INVITATION",
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    payload: {
      workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
      issueId: { type: mongoose.Schema.Types.ObjectId, ref: "Issue" },
      issueKey: { type: String },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
      sprintId: { type: mongoose.Schema.Types.ObjectId, ref: "Sprint" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      metadata: { type: mongoose.Schema.Types.Mixed },
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
