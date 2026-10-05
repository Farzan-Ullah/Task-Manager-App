const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Workspace Admin", "Project Manager", "Member", "Guest"],
      default: "Member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  { _id: true }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
    },
    members: [memberSchema],
    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free",
    },
    settings: {
      defaultRole: {
        type: String,
        enum: ["Workspace Admin", "Project Manager", "Member", "Guest"],
        default: "Member",
      },
      allowGuestInvites: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ownerId to support both owner and ownerId
workspaceSchema.virtual("ownerId").get(function () {
  return this.owner;
});

// Indexes for fast querying
workspaceSchema.index({ "members.userId": 1 });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ inviteCode: 1 });

const Workspace = mongoose.model("Workspace", workspaceSchema);
module.exports = Workspace;
