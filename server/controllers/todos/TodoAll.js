const Todos = require("../../models/todo");
const User = require("../../models/user");
const getAllTodos = async (req, res) => {
  try {
    // const userId = req.user._id;
    const userId = req.user.userId;
    const role = req.user.role;

    let query = {};
    if (role === "Admin") {
      query = {}; // Admin sees all
    } else {
      query = { $or: [{ user: userId }, { assignee: userId }] }; // Employee sees created or assigned
    }

    const todos = await Todos.find(query).populate(
      "assignee",
      "email name"
    ).populate("user", "email name");
    if (!todos || todos.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No todos found for the user",
      });
    }
    res.status(200).json({
      success: true,
      message: "Todos retrieved successfully",
      todos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = getAllTodos;
