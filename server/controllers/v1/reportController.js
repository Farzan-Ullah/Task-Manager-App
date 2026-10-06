const mongoose = require("mongoose");
const moment = require("moment");
const { Sprint, Issue, Project, User } = require("../../models");

/**
 * Sprint Burndown Chart Data
 * Calculates daily ideal burndown vs actual remaining story points
 */
const getBurndown = async (req, res, next) => {
  try {
    const { sprintId } = req.query;

    if (!sprintId) {
      return res.status(400).json({ success: false, message: "sprintId is required" });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    const issues = await Issue.find({ sprintId })
      .select("key title estimate status updatedAt createdAt priority assigneeId")
      .populate("assigneeId", "name email avatar");

    const totalIssues = issues.length;
    const completedIssues = issues.filter((i) => i.status === "Done").length;
    const remainingIssues = totalIssues - completedIssues;
    const issueCompletionPercentage =
      totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    const totalCommittedPoints = issues.reduce((acc, i) => acc + (i.estimate || 0), 0);
    const completedPoints = issues
      .filter((i) => i.status === "Done")
      .reduce((acc, i) => acc + (i.estimate || 0), 0);
    const remainingPoints = Math.max(0, totalCommittedPoints - completedPoints);
    const pointsCompletionPercentage =
      totalCommittedPoints > 0
        ? Math.round((completedPoints / totalCommittedPoints) * 100)
        : 0;

    // Timeline calculation
    const start = sprint.startDate ? moment(sprint.startDate) : moment(sprint.createdAt);
    const end = sprint.endDate ? moment(sprint.endDate) : moment(start).add(14, "days");
    const totalDays = Math.max(1, end.diff(start, "days"));

    const timeline = [];
    const idealStepPoints = totalCommittedPoints / totalDays;
    const idealStepIssues = totalIssues / totalDays;

    for (let d = 0; d <= totalDays; d++) {
      const currentDay = moment(start).add(d, "days");
      const dateStr = currentDay.format("MMM DD");

      // Ideal points & issues
      const idealPoints = Math.max(0, Math.round((totalCommittedPoints - d * idealStepPoints) * 10) / 10);
      const idealIssues = Math.max(0, Math.round((totalIssues - d * idealStepIssues) * 10) / 10);

      // Actual points & issues remaining on this day
      let actualPoints = null;
      let actualIssues = null;

      if (currentDay.isSameOrBefore(moment(), "day")) {
        // Calculate points completed after currentDay
        const donePointsAfterDay = issues
          .filter(
            (i) =>
              i.status === "Done" &&
              i.updatedAt &&
              moment(i.updatedAt).isAfter(currentDay, "day")
          )
          .reduce((acc, i) => acc + (i.estimate || 0), 0);

        const openPoints = issues
          .filter((i) => i.status !== "Done")
          .reduce((acc, i) => acc + (i.estimate || 0), 0);

        actualPoints = openPoints + donePointsAfterDay;

        // Calculate issues completed after currentDay
        const doneIssuesAfterDay = issues.filter(
          (i) =>
            i.status === "Done" &&
            i.updatedAt &&
            moment(i.updatedAt).isAfter(currentDay, "day")
        ).length;

        const openIssues = issues.filter((i) => i.status !== "Done").length;
        actualIssues = openIssues + doneIssuesAfterDay;
      }

      timeline.push({
        day: dateStr,
        ideal: idealPoints,
        actual: actualPoints,
        idealIssues,
        actualIssues,
      });
    }

    res.status(200).json({
      success: true,
      sprint: {
        _id: sprint._id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      metrics: {
        totalCommittedPoints,
        completedPoints,
        remainingPoints,
        completionPercentage: pointsCompletionPercentage,
        totalIssues,
        completedIssues,
        remainingIssues,
        issueCompletionPercentage,
        hasEstimates: totalCommittedPoints > 0,
      },
      timeline,
      issues: issues.map((i) => ({
        _id: i._id,
        key: i.key,
        title: i.title,
        status: i.status,
        estimate: i.estimate || 0,
        priority: i.priority,
        assignee: i.assigneeId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sprint Velocity Report
 * Shows completed vs committed story points across sprints
 */
const getVelocity = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }

    const sprints = await Sprint.find({ projectId })
      .sort({ createdAt: 1 })
      .limit(10);

    const velocityData = await Promise.all(
      sprints.map(async (s) => {
        const issues = await Issue.find({ sprintId: s._id }).select("estimate status");
        const committed = issues.reduce((acc, i) => acc + (i.estimate || 0), 0);
        const completed = issues
          .filter((i) => i.status === "Done")
          .reduce((acc, i) => acc + (i.estimate || 0), 0);

        const totalIssues = issues.length;
        const completedIssues = issues.filter((i) => i.status === "Done").length;

        return {
          sprintId: s._id,
          name: s.name,
          status: s.status,
          committed,
          completed,
          committedIssues: totalIssues,
          completedIssues,
        };
      })
    );

    const hasEstimates = velocityData.some((v) => v.committed > 0);

    res.status(200).json({
      success: true,
      velocity: velocityData,
      hasEstimates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cumulative Flow Diagram Data
 * Shows issue distribution by status over recent days
 */
const getCumulativeFlow = async (req, res, next) => {
  try {
    const { projectId, days = 14 } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }

    const numDays = Math.min(60, Number(days) || 14);
    const flowData = [];
    const now = moment();

    const issues = await Issue.find({ projectId }).select("status createdAt updatedAt");

    for (let i = numDays - 1; i >= 0; i--) {
      const targetDate = moment(now).subtract(i, "days").endOf("day");
      const dateLabel = targetDate.format("MMM DD");

      // Filter issues created on or before target date
      const activeByDate = issues.filter((iss) =>
        moment(iss.createdAt).isSameOrBefore(targetDate)
      );

      const backlog = activeByDate.filter((iss) => iss.status === "Backlog").length;
      const todo = activeByDate.filter((iss) => iss.status === "To Do").length;
      const inProgress = activeByDate.filter((iss) => iss.status === "In Progress").length;
      const review = activeByDate.filter((iss) => iss.status === "Review" || iss.status === "Testing").length;
      const done = activeByDate.filter((iss) => iss.status === "Done").length;

      flowData.push({
        date: dateLabel,
        Backlog: backlog,
        "To Do": todo,
        "In Progress": inProgress,
        Review: review,
        Done: done,
      });
    }

    res.status(200).json({
      success: true,
      cumulativeFlow: flowData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Member Workload Distribution
 * Shows issues and story points assigned to each team member
 */
const getWorkload = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }

    const workload = await Issue.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: "$assigneeId",
          totalIssues: { $sum: 1 },
          openIssues: {
            $sum: { $cond: [{ $ne: ["$status", "Done"] }, 1, 0] },
          },
          completedIssues: {
            $sum: { $cond: [{ $eq: ["$status", "Done"] }, 1, 0] },
          },
          totalPoints: { $sum: { $ifNull: ["$estimate", 0] } },
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
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: "$_id",
          name: { $ifNull: ["$user.name", "Unassigned"] },
          email: { $ifNull: ["$user.email", ""] },
          avatar: { $ifNull: ["$user.avatar", ""] },
          totalIssues: 1,
          openIssues: 1,
          completedIssues: 1,
          totalPoints: 1,
        },
      },
      { $sort: { openIssues: -1 } },
    ]);

    res.status(200).json({
      success: true,
      workload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Project Overall Statistics
 */
const getProjectSummary = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }

    const issues = await Issue.find({ projectId }).select("status dueDate priority");

    const totalIssues = issues.length;
    const open = issues.filter((i) => i.status === "To Do" || i.status === "Backlog").length;
    const inProgress = issues.filter((i) => i.status === "In Progress" || i.status === "Review").length;
    const done = issues.filter((i) => i.status === "Done").length;
    const overdue = issues.filter(
      (i) => i.status !== "Done" && i.dueDate && moment(i.dueDate).isBefore(moment(), "day")
    ).length;

    const highPriority = issues.filter(
      (i) => i.status !== "Done" && (i.priority === "High" || i.priority === "Highest")
    ).length;

    res.status(200).json({
      success: true,
      summary: {
        totalIssues,
        open,
        inProgress,
        done,
        overdue,
        highPriority,
        completionRate: totalIssues > 0 ? Math.round((done / totalIssues) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBurndown,
  getVelocity,
  getCumulativeFlow,
  getWorkload,
  getProjectSummary,
};
