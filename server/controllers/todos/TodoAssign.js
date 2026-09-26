const Todos = require("../../models/todo");
const User = require("../../models/user");

const assignTodoByEmail = async (req, res) => {
  try {
    const { email, todoId } = req.body;
    const assignee = await User.findOne({ email });

    if (!assignee) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res
        .status(404)
        .json({ success: false, message: "Todo not found" });
    }

    todo.assignee = assignee._id;
    await todo.save();

    res
      .status(200)
      .json({ success: true, message: "Todo assigned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = assignTodoByEmail;
