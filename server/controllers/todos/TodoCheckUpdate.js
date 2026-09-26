const  Todos  = require("../../models/todo");
const updateCheck = async (req, res) => {
  try {
    const todoId = req.params.id;
    const { tasks } = req.body;
    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    if (tasks) {
      todo.tasks = tasks.map((task) => ({
        title: task.title,
        completed: task.completed,
      }));
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

module.exports =  updateCheck ;
