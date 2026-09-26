const Todos = require("../../models/todo");
const User = require("../../models/user");
const getAssignedTodos = async (req, res) => {
  try {
    if (!req.user) {
      console.error("User not found in request");
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
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

    const user = await User.findById(userId).populate("todos");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      todos: user.todos,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = getAssignedTodos;
