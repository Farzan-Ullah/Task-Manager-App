const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    wipLimit: {
      type: Number,
      default: 0, // 0 means no limit
    },
    statusMap: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: true }
);

const boardSchema = new mongoose.Schema(
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
      default: "Kanban Board",
    },
    columns: {
      type: [columnSchema],
      default: [
        { id: "backlog", name: "Backlog", wipLimit: 0, statusMap: "Backlog", order: 0 },
        { id: "todo", name: "To Do", wipLimit: 0, statusMap: "To Do", order: 1 },
        { id: "in-progress", name: "In Progress", wipLimit: 5, statusMap: "In Progress", order: 2 },
        { id: "review", name: "Review", wipLimit: 3, statusMap: "Review", order: 3 },
        { id: "testing", name: "Testing", wipLimit: 3, statusMap: "Testing", order: 4 },
        { id: "done", name: "Done", wipLimit: 0, statusMap: "Done", order: 5 },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

boardSchema.index({ projectId: 1 });

const Board = mongoose.model("Board", boardSchema);
module.exports = Board;
