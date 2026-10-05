const { Sprint, Issue, Project } = require("../../models");
const socketService = require("../../services/socketService");
const notificationService = require("../../services/notificationService");
const activityService = require("../../services/activityService");

/**
 * Create a new sprint
 */
const createSprint = async (req, res, next) => {
  try {
    const { projectId, name, goal = "", startDate = null, endDate = null } = req.body;

    if (!projectId || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Project ID and Sprint name are required" });
    }

    const sprint = new Sprint({
      projectId,
      name: name.trim(),
      goal,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: "PLANNED",
    });

    await sprint.save();

    socketService.emitToProject(projectId, "sprint.created", sprint);

    res.status(201).json({
      success: true,
      message: `Sprint "${sprint.name}" created`,
      sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all sprints for a project with metrics
 */
const getSprints = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const sprints = await Sprint.find({ projectId }).sort({ createdAt: -1 });

    const sprintsWithStats = await Promise.all(
      sprints.map(async (s) => {
        const issues = await Issue.find({ sprintId: s._id }).select("status estimate");
        const totalIssues = issues.length;
        const completedIssues = issues.filter((i) => i.status === "Done").length;
        const totalPoints = issues.reduce((acc, i) => acc + (i.estimate || 0), 0);
        const completedPoints = issues
          .filter((i) => i.status === "Done")
          .reduce((acc, i) => acc + (i.estimate || 0), 0);

        const obj = s.toObject();
        obj.totalIssues = totalIssues;
        obj.completedIssues = completedIssues;
        obj.totalPoints = totalPoints;
        obj.completedPoints = completedPoints;
        obj.completionPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
        return obj;
      })
    );

    res.status(200).json({
      success: true,
      sprints: sprintsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sprint details with its issues
 */
const getSprintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    const issues = await Issue.find({ sprintId: id })
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .sort({ rank: 1 });

    res.status(200).json({
      success: true,
      sprint,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update sprint
 */
const updateSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate, committedPoints } = req.body;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    if (name) sprint.name = name.trim();
    if (goal !== undefined) sprint.goal = goal;
    if (startDate !== undefined) sprint.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) sprint.endDate = endDate ? new Date(endDate) : null;
    if (committedPoints !== undefined) sprint.committedPoints = Number(committedPoints);

    await sprint.save();

    socketService.emitToProject(sprint.projectId, "sprint.updated", sprint);

    res.status(200).json({
      success: true,
      message: "Sprint updated successfully",
      sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start sprint
 */
const startSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
    const userId = req.user.userId;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    if (sprint.status === "ACTIVE") {
      return res.status(400).json({ success: false, message: "Sprint is already active" });
    }

    // Check if another sprint is currently active in the project
    const activeSprint = await Sprint.findOne({ projectId: sprint.projectId, status: "ACTIVE" });
    if (activeSprint) {
      return res.status(400).json({
        success: false,
        message: `Sprint "${activeSprint.name}" is already active. Please complete it before starting a new sprint.`,
      });
    }

    // Calculate committed points from assigned issues
    const sprintIssues = await Issue.find({ sprintId: sprint._id });
    const committedPoints = sprintIssues.reduce((acc, i) => acc + (i.estimate || 0), 0);

    sprint.status = "ACTIVE";
    sprint.startDate = startDate ? new Date(startDate) : new Date();
    if (endDate) sprint.endDate = new Date(endDate);
    sprint.committedPoints = committedPoints;
    await sprint.save();

    // Log Activity
    await activityService.logActivity({
      projectId: sprint.projectId,
      actorId: userId,
      action: "SPRINT_STARTED",
      diff: { sprintName: sprint.name, committedPoints },
    });

    // Notify project members
    const project = await Project.findById(sprint.projectId);
    if (project) {
      await notificationService.notifyRole(project, "Member", {
        type: "SPRINT_START",
        title: `Sprint Started: ${sprint.name}`,
        message: `Sprint "${sprint.name}" is now active with ${sprintIssues.length} issues (${committedPoints} story points).`,
        payload: {
          projectId: project._id,
          sprintId: sprint._id,
          senderId: userId,
        },
      });
    }

    socketService.emitToProject(sprint.projectId, "sprint.started", sprint);

    res.status(200).json({
      success: true,
      message: `Sprint "${sprint.name}" started successfully`,
      sprint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete sprint with rollover of unfinished issues
 */
const completeSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rolloverTo = "backlog", nextSprintId = null } = req.body;
    const userId = req.user.userId;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    // Find unfinished issues
    const unfinishedIssues = await Issue.find({
      sprintId: sprint._id,
      status: { $ne: "Done" },
    });

    let targetSprint = null;
    if (rolloverTo === "next" && nextSprintId) {
      targetSprint = await Sprint.findById(nextSprintId);
    }

    const targetSprintId = targetSprint ? targetSprint._id : null;

    // Rollover unfinished issues without deleting or losing them
    if (unfinishedIssues.length > 0) {
      await Issue.updateMany(
        { _id: { $in: unfinishedIssues.map((i) => i._id) } },
        { $set: { sprintId: targetSprintId } }
      );
    }

    sprint.status = "COMPLETED";
    await sprint.save();

    // Log Activity
    await activityService.logActivity({
      projectId: sprint.projectId,
      actorId: userId,
      action: "SPRINT_COMPLETED",
      diff: {
        sprintName: sprint.name,
        unfinishedIssuesRolledOver: unfinishedIssues.length,
        rolloverDestination: targetSprint ? targetSprint.name : "Backlog",
      },
    });

    socketService.emitToProject(sprint.projectId, "sprint.completed", {
      sprintId: sprint._id,
      rolloverCount: unfinishedIssues.length,
    });

    res.status(200).json({
      success: true,
      message: `Sprint "${sprint.name}" completed. ${unfinishedIssues.length} unfinished issues moved to ${
        targetSprint ? targetSprint.name : "Backlog"
      }.`,
      sprint,
      unfinishedCount: unfinishedIssues.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete sprint (moves all issues to backlog)
 */
const deleteSprint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }

    // Return issues to backlog
    await Issue.updateMany({ sprintId: id }, { $set: { sprintId: null } });
    await Sprint.findByIdAndDelete(id);

    socketService.emitToProject(sprint.projectId, "sprint.deleted", { sprintId: id });

    res.status(200).json({
      success: true,
      message: "Sprint deleted and issues moved to backlog",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSprint,
  getSprints,
  getSprintById,
  updateSprint,
  startSprint,
  completeSprint,
  deleteSprint,
};
