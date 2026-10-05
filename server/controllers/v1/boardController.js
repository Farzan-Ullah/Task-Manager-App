const { Board } = require("../../models");
const socketService = require("../../services/socketService");

/**
 * Get board for a project
 */
const getBoardByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    let board = await Board.findOne({ projectId });
    if (!board) {
      board = new Board({
        projectId,
        name: "Kanban Board",
      });
      await board.save();
    }

    res.status(200).json({
      success: true,
      board,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update board columns (add, rename, reorder, WIP limits)
 */
const updateColumns = async (req, res, next) => {
  try {
    const { id } = req.params; // board id
    const { columns } = req.body;

    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ success: false, message: "Columns array is required" });
    }

    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }

    // Ensure order is assigned properly
    board.columns = columns.map((col, index) => ({
      id: col.id || col.name.toLowerCase().replace(/\s+/g, "-"),
      name: col.name,
      wipLimit: Number(col.wipLimit) || 0,
      statusMap: col.statusMap || col.name,
      order: index,
    }));

    await board.save();

    socketService.emitToBoard(board._id, "board.columns.updated", board);
    socketService.emitToProject(board.projectId, "board.columns.updated", board);

    res.status(200).json({
      success: true,
      message: "Board columns updated successfully",
      board,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBoardByProject,
  updateColumns,
};
