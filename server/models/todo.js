const mongoose = require("mongoose");
const Tasks = require("./task");
const todoSchema = new mongoose.Schema(
  {
    title: String,
    priority: {
      type: String,
      enum: ["HIGH", "MODERATE", "LOW"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tasks: [Tasks.schema],
    date: Date,
    label: {
      type: String,
      enum: ["PROGRESS", "TO-DO", "DONE", "BACKLOG"],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Todos = mongoose.model("Todos", todoSchema);

module.exports = Todos;
