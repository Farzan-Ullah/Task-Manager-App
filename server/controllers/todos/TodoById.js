const getTodoById = async (req, res) => {
  try {
    const { todoId } = req.params;

    if (!todoId) {
      return res.status(400).json({
        success: false,
        message: "Todo ID is missing",
      });
    }

    const todo = await Todos.findById(todoId);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(200).json({
      success: true,
      todo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = getTodoById;
