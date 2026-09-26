const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: String,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Tasks = mongoose.model("Tasks", taskSchema);

module.exports = Tasks;
