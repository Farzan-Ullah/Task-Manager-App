const mongoose = require("mongoose");

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "contains", "in"],
      default: "equals",
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true, // e.g. "NOTIFY_USER", "NOTIFY_ROLE", "ASSIGN_USER", "SET_STATUS", "SET_PRIORITY"
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const automationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    trigger: {
      type: {
        type: String,
        required: true, // "STATUS_CHANGED", "PRIORITY_CHANGED", "ISSUE_CREATED", "SPRINT_STARTED"
      },
      config: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    conditions: [conditionSchema],
    actions: [actionSchema],
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

automationSchema.index({ projectId: 1, enabled: 1 });

const Automation = mongoose.model("Automation", automationSchema);
module.exports = Automation;
