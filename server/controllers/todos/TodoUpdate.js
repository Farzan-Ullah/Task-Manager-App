const Todos = require("../../models/todo");
const User = require("../../models/user");

const updateTodo = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admins can update tasks",
      });
    }
    const todoId = req.params.id;
    const { title, priority, label, date, tasks, assigneeEmail } = req.body;
    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    let assignee = null;
    if (assigneeEmail) {
      assignee = await User.findOne({ email: assigneeEmail });
      if (!assignee) {
        return res
          .status(404)
          .json({ success: false, message: "Assignee not found" });
      }
    }

    todo.title = title || todo.title;
    todo.priority = priority || todo.priority;
    todo.label = label || todo.label;
    todo.date = date !== undefined ? date : todo.date;
    if (tasks) {
      todo.tasks = tasks.map((task) => ({
        title: task.title,
        completed: task.completed,
      }));
    }

    if (assigneeEmail !== undefined) {
      todo.assignee = assignee ? assignee._id : null;
    }

    await todo.save();

    res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      updatedTodo: todo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = updateTodo;
