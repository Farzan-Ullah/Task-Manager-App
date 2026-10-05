const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true, // e.g. "ISSUE_CREATED", "STATUS_CHANGED", "ASSIGNED", "SPRINT_STARTED", etc.
    },
    diff: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

activitySchema.index({ projectId: 1, createdAt: -1 });
activitySchema.index({ issueId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;
