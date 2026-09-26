const  Todos  = require("../../models/todo");
const deleteTodo = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admins can delete tasks",
      });
    }
    const todoId = req.params.id;
    const deletedTodo = await Todos.findByIdAndDelete(todoId);
    if (!deletedTodo) {
      return res
        .status(404)
        .json({ success: false, message: "Todo not found" });
    }
    res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = deleteTodo ;
