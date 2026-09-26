const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);
module.exports = Workspace;
