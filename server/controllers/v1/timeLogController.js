const mongoose = require("mongoose");
const { TimeLog, Issue } = require("../../models");

/**
 * Log time on an issue
 */
const createTimeLog = async (req, res, next) => {
  try {
    const { issueId, minutes, date, note = "" } = req.body;
    const userId = req.user.userId;

    if (!issueId || !minutes || Number(minutes) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Issue ID and positive minutes are required",
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    if (req.user.role === "Guest") {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Logging time is restricted.",
      });
    }

    const timeLog = new TimeLog({
      issueId,
      userId,
      projectId: issue.projectId,
      minutes: Number(minutes),
      date: date ? new Date(date) : new Date(),
      note: note.trim(),
    });

    await timeLog.save();

    const populated = await TimeLog.findById(timeLog._id)
      .populate("userId", "name email avatar")
      .populate("issueId", "key title");

    res.status(201).json({
      success: true,
      message: "Time logged successfully",
      timeLog: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get time logs with filtering
 */
const getTimeLogs = async (req, res, next) => {
  try {
    const { issueId, projectId, userId, startDate, endDate } = req.query;

    const query = {};
    if (issueId) query.issueId = issueId;
    if (projectId) query.projectId = projectId;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const timeLogs = await TimeLog.find(query)
      .populate("userId", "name email avatar")
      .populate("issueId", "key title")
      .populate("projectId", "name key")
      .sort({ date: -1 });

    const totalMinutes = timeLogs.reduce((acc, t) => acc + (t.minutes || 0), 0);

    res.status(200).json({
      success: true,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(2),
      timeLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Timesheet aggregation summary (daily, weekly, monthly, project, user)
 */
const getTimesheetSummary = async (req, res, next) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    const matchQuery = {};
    if (projectId) matchQuery.projectId = new mongoose.Types.ObjectId(projectId);

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    // Aggregation by user
    const byUser = await TimeLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$userId",
          totalMinutes: { $sum: "$minutes" },
          entriesCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          avatar: "$user.avatar",
          totalMinutes: 1,
          totalHours: { $round: [{ $divide: ["$totalMinutes", 60] }, 2] },
          entriesCount: 1,
        },
      },
      { $sort: { totalMinutes: -1 } },
    ]);

    // Aggregation by date
    const byDate = await TimeLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalMinutes: { $sum: "$minutes" },
          entriesCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalMinutes = byUser.reduce((acc, u) => acc + u.totalMinutes, 0);

    res.status(200).json({
      success: true,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(2),
      byUser,
      byDate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a time log entry
 */
const deleteTimeLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const timeLog = await TimeLog.findById(id);
    if (!timeLog) {
      return res.status(404).json({ success: false, message: "Time log entry not found" });
    }

    if (timeLog.userId.toString() !== userId.toString() && req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "You can only delete your own time logs" });
    }

    await TimeLog.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Time log deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTimeLog,
  getTimeLogs,
  getTimesheetSummary,
  deleteTimeLog,
};
