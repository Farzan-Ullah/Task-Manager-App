const Todos  = require("../../models/todo");
const doneLabel = async (req, res) => {
  try {
    // const userId = req.user._id;
    const userId = req.user.userId;
    const label = req.params.label;
    const filteredTodos = await Todos.find({
      workspace: req.user.workspaceId,
      $or: [{ user: userId }, { assignee: userId }],
      label: label,
    });
    res.status(200).json({
      success: true,
      message: "Todos filtered successfully",
      todos: filteredTodos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = doneLabel ;
