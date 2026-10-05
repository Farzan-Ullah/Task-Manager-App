const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Project Manager", "Member", "Guest"],
      default: "Member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [projectMemberSchema],
    settings: {
      defaultAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      issueTypes: {
        type: [String],
        default: ["Task", "Bug", "Story"],
      },
      priorities: {
        type: [String],
        default: ["Highest", "High", "Medium", "Low", "Lowest"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Enforce unique project key per workspace
projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
projectSchema.index({ "members.userId": 1 });
projectSchema.index({ leadId: 1 });

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
