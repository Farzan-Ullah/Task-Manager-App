const Todos = require("../../models/todo");
const moment = require("moment");
const analyticsData = async (req, res) => {
  try {
    // const userId = req.user._id;
    const userId = req.user.userId;
    const { filterType } = req.params;
    let startDate, endDate;
    switch (filterType) {
      case "day":
        startDate = moment().startOf("day").toDate();
        endDate = moment(startDate).endOf("day").toDate();
        break;
      case "week":
        startDate = moment().startOf("week").toDate();
        endDate = moment().endOf("week").toDate();
        break;
      case "month":
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid filter type. Use 'day', 'week', or 'month'.",
        });
    }
    const role = req.user.role;
    let query = {
      workspace: req.user.workspaceId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (role !== "Admin") {
      query.$or = [{ user: userId }, { assignee: userId }];
    }

    const todos = await Todos.find(query);

    const filteredTodos = {
      BACKLOG: todos.filter((x) => x.label === "BACKLOG"),
      TODO: todos.filter((x) => x.label === "TO-DO"),
      DONE: todos.filter((x) => x.label === "DONE"),
      PROGRESS: todos.filter((x) => x.label === "PROGRESS"),
      HighPr: todos
        .filter((x) => x.label !== "DONE")
        .filter((x) => x.priority === "HIGH"),
      ModeratePr: todos
        .filter((x) => x.label !== "DONE")
        .filter((x) => x.priority === "MODERATE"),
      LowPr: todos
        .filter((x) => x.label !== "DONE")
        .filter((x) => x.priority === "LOW"),
      dueDateTasks: todos
        .filter((x) => x.label !== "DONE")
        .filter((x) => x.date !== null),
    };
    const lengths = {
      BACKLOG: filteredTodos.BACKLOG.length,
      TODO: filteredTodos.TODO.length,
      DONE: filteredTodos.DONE.length,
      PROGRESS: filteredTodos.PROGRESS.length,
      HighPr: filteredTodos.HighPr.length,
      ModeratePr: filteredTodos.ModeratePr.length,
      LowPr: filteredTodos.LowPr.length,
      dueDateTasks: filteredTodos.dueDateTasks.length,
    };
    res.status(200).json({
      success: true,
      message: `Todos for the current ${filterType} retrieved successfully`,
      filteredTodos,
      lengths,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

module.exports = analyticsData;
