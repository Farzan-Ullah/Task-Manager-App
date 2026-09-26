const  Todos  = require("../../models/todo");
const labelCreate = async (req, res) => {
  try {
    const todoId = req.params.id;
    const { label } = req.body;
    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }
    todo.label = label || todo.label;
    await todo.save();
    res.status(200).json({
      success: true,
      message: "Todo label added successfully",
      updatedTodo: todo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports =  labelCreate ;
