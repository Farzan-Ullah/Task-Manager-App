const  Todos  = require("../../models/todo");
const getParticularTodo = async (req, res) => {
  try {
    const todoId = req.params.id;
    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Todo retrieved successfully",
      todo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports =  getParticularTodo ;
