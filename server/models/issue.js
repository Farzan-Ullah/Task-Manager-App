const mongoose = require("mongoose");
const Tasks = require("./task");

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const pullRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    prNumber: { type: Number },
    url: { type: String, required: true, trim: true },
    branch: { type: String, default: "", trim: true },
    targetBranch: { type: String, default: "main", trim: true },
    status: {
      type: String,
      enum: ["OPEN", "MERGED", "CLOSED"],
      default: "OPEN",
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    mergedAt: { type: Date, default: null },
  },
  { _id: true }
);

const issueSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
    },
    key: {
      type: String,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Task", "Bug", "Story", "Issue", "Request"],
      default: "Task",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "To Do",
      index: true,
    },
    priority: {
      type: String,
      enum: [
        "Highest",
        "High",
        "Medium",
        "Low",
        "Lowest",
        "HIGH",
        "MODERATE",
        "LOW",
      ],
      default: "Medium",
      index: true,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
      index: true,
    },
    rank: {
      type: String,
      default: "0|h00000:",
      index: true,
    },
    labels: {
      type: [String],
      default: [],
    },
    estimate: {
      type: Number,
      default: 0, // Story points
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    attachments: [attachmentSchema],
    pullRequests: [pullRequestSchema],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Legacy fields for 100% backward compatibility
    tasks: [Tasks.schema],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    date: {
      type: Date,
    },
    label: {
      type: String,
      enum: ["PROGRESS", "TO-DO", "DONE", "BACKLOG", "Review", "Testing", null],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Map legacy labels to normalized status and vice-versa
const LABEL_TO_STATUS = {
  "BACKLOG": "Backlog",
  "TO-DO": "To Do",
  "PROGRESS": "In Progress",
  "DONE": "Done",
};

const STATUS_TO_LABEL = {
  "Backlog": "BACKLOG",
  "To Do": "TO-DO",
  "In Progress": "PROGRESS",
  "Review": "PROGRESS",
  "Testing": "PROGRESS",
  "Done": "DONE",
};

// Pre-save synchronization hook
issueSchema.pre("save", function (next) {
  // Sync reporterId <-> user
  if (!this.reporterId && this.user) {
    this.reporterId = this.user;
  } else if (!this.user && this.reporterId) {
    this.user = this.reporterId;
  }

  // Sync assigneeId <-> assignee
  if (!this.assigneeId && this.assignee) {
    this.assigneeId = this.assignee;
  } else if (!this.assignee && this.assigneeId) {
    this.assignee = this.assigneeId;
  }

  // Sync dueDate <-> date
  if (!this.dueDate && this.date) {
    this.dueDate = this.date;
  } else if (!this.date && this.dueDate) {
    this.date = this.dueDate;
  }

  // Sync label <-> status
  if (this.label && (!this.status || this.isModified("label"))) {
    this.status = LABEL_TO_STATUS[this.label] || this.label;
  } else if (this.status && (!this.label || this.isModified("status"))) {
    this.label = STATUS_TO_LABEL[this.status] || "TO-DO";
  }

  // Normalize uppercase priority if set
  if (this.priority === "HIGH") this.priority = "High";
  if (this.priority === "MODERATE") this.priority = "Medium";
  if (this.priority === "LOW") this.priority = "Low";

  next();
});

// Indexes for high performance
issueSchema.index({ projectId: 1, sprintId: 1, rank: 1 });
issueSchema.index({ projectId: 1, status: 1 });
issueSchema.index({ projectId: 1, assigneeId: 1 });
issueSchema.index({ projectId: 1, priority: 1 });
issueSchema.index({ projectId: 1, createdAt: -1 });

// Full-text search index
issueSchema.index(
  {
    title: "text",
    description: "text",
    key: "text",
    labels: "text",
  },
  {
    weights: {
      key: 10,
      title: 5,
      labels: 3,
      description: 1,
    },
    name: "IssueTextIndex",
  }
);

const Issue = mongoose.models.Issue || mongoose.model("Issue", issueSchema, "todos");
module.exports = Issue;
