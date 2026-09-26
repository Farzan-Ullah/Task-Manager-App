const Todos = require("../../models/todo");
const User = require("../../models/user");

const addTodo = async (req, res) => {
  try {
    const { title, priority, label, date, tasks, assigneeEmail } = req.body;

    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admins can create tasks",
      });
    }

    const userId = req.user.userId;

    if (!userId) {
      console.error("User ID not found");
      return res.status(400).json({
        success: false,
        message: "User ID is missing",
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

    const newTodo = new Todos({
      title,
      priority,
      label,
      date,
      tasks: tasks.map((task) => ({
        title: task.title,
        completed: task.completed,
      })),
      user: userId,
      assignee: assignee ? assignee._id : null,
    });
    await newTodo.save();
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      newTodo,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = addTodo;
