const mongoose = require("mongoose");
const { Issue, Project, Workspace, User, Counter, Comment, TimeLog, Activity } = require("../../models");
const { initialRank, between } = require("../../utils/lexorank");
const socketService = require("../../services/socketService");
const activityService = require("../../services/activityService");
const notificationService = require("../../services/notificationService");
const automationService = require("../../services/automationService");

/**
 * Check if a user has Project Manager or Workspace Admin permissions
 */
const isUserManager = async (userId, projectId) => {
  try {
    const user = await User.findById(userId);
    if (user && user.role === "Admin") return true;

    const project = await Project.findById(projectId);
    if (!project) return false;

    if (project.leadId && project.leadId.toString() === userId.toString()) return true;

    const workspace = await Workspace.findById(project.workspaceId);
    if (workspace) {
      if (workspace.owner && workspace.owner.toString() === userId.toString()) return true;
      const wkspMember = workspace.members?.find(
        (m) => m.userId.toString() === userId.toString() && m.status === "ACTIVE"
      );
      if (wkspMember && wkspMember.role === "Workspace Admin") return true;
    }

    const projMember = project.members?.find(
      (m) => m.userId.toString() === userId.toString()
    );
    if (projMember && (projMember.role === "Project Manager" || projMember.role === "Workspace Admin")) {
      return true;
    }

    return false;
  } catch (err) {
    console.error("Error in isUserManager:", err);
    return false;
  }
};

/**
 * Check if a user is a Guest in the project/workspace
 */
const isUserGuest = async (userId, projectId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;
    if (user.role === "Admin") return false;
    if (user.role === "Guest") return true;

    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        const projMember = project.members?.find(
          (m) => m.userId.toString() === userId.toString()
        );
        if (projMember && projMember.role === "Guest") return true;

        const workspace = await Workspace.findById(project.workspaceId);
        if (workspace) {
          const wkspMember = workspace.members?.find(
            (m) => m.userId.toString() === userId.toString() && m.status === "ACTIVE"
          );
          if (wkspMember && wkspMember.role === "Guest") return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error("Error in isUserGuest:", err);
    return false;
  }
};

/**
 * Create a new issue/task
 */
const createIssue = async (req, res, next) => {
  try {
    const {
      projectId,
      title,
      description = "",
      type = "Task",
      status = "To Do",
      priority = "Medium",
      assigneeId,
      sprintId = null,
      labels = [],
      estimate = 0,
      parentId = null,
      startDate = null,
      dueDate = null,
    } = req.body;

    const userId = req.user.userId;

    if (!projectId || !title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project ID and issue title are required",
      });
    }

    // Guest users cannot create tasks
    if (await isUserGuest(userId, projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. They cannot create tasks or issues.",
      });
    }

    const isManager = await isUserManager(userId, projectId);

    // Jira rule: Tasks/Stories creation & assignment is controlled by Manager.
    // Employees can create Bugs, Issues, Requests, or unassigned tasks.
    if (!isManager && assigneeId && assigneeId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only Project Managers can assign tasks to other team members. You can leave it unassigned for manager triage or assign to yourself.",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Generate key: hierarchical if subtask (CRM-101-1) or sequential if root issue (CRM-107)
    let key;
    if (parentId) {
      const parentIssue = await Issue.findById(parentId);
      if (parentIssue) {
        const subtaskCount = await Issue.countDocuments({ parentId });
        key = `${parentIssue.key}-${subtaskCount + 1}`;
      }
    }

    if (!key) {
      const seq = await Counter.getNextSequence(projectId);
      key = `${project.key}-${seq}`;
    }

    // Get bottom rank in target status column
    const lastIssueInColumn = await Issue.findOne({ projectId, status })
      .sort({ rank: -1 })
      .select("rank");

    const rank = between(lastIssueInColumn?.rank || null, null);

    const issue = new Issue({
      projectId,
      workspace: project.workspaceId,
      key,
      type,
      title: title.trim(),
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      reporterId: userId,
      sprintId: sprintId || null,
      rank,
      labels: Array.isArray(labels) ? labels : [],
      estimate: Number(estimate) || 0,
      parentId: parentId || null,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      watchers: [userId],
    });

    await issue.save();

    const populatedIssue = await Issue.findById(issue._id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar");

    // Log Activity
    await activityService.logActivity({
      projectId,
      issueId: issue._id,
      actorId: userId,
      action: "ISSUE_CREATED",
      diff: { title: issue.title, key: issue.key, status: issue.status },
    });

    // Notify assignee if assigned to someone else
    if (assigneeId && assigneeId.toString() !== userId.toString()) {
      await notificationService.createNotification({
        userId: assigneeId,
        type: "ASSIGNMENT",
        title: `Assigned: ${key}`,
        message: `You were assigned to ${key}: "${issue.title}" by ${req.user.email}`,
        payload: {
          projectId,
          issueId: issue._id,
          issueKey: key,
          senderId: userId,
        },
      });
    }

    // Trigger automations
    await automationService.triggerAutomations("ISSUE_CREATED", {
      projectId,
      issue: populatedIssue,
      actorId: userId,
    });

    // Broadcast real-time event
    socketService.emitToProject(projectId, "issue.created", populatedIssue);

    res.status(201).json({
      success: true,
      message: `Issue ${key} created successfully`,
      issue: populatedIssue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get issues with filtering, pagination, and full-text search
 */
const getIssues = async (req, res, next) => {
  try {
    const {
      projectId,
      status,
      assigneeId,
      reporterId,
      priority,
      type,
      sprintId,
      label,
      search,
      page = 1,
      limit = 100,
      sortBy = "rank",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (assigneeId) query.assigneeId = assigneeId;
    if (reporterId) query.reporterId = reporterId;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (sprintId === "backlog") {
      query.sprintId = null;
    } else if (sprintId) {
      query.sprintId = sprintId;
    }
    if (label) query.labels = label;
    if (req.query.rootOnly === "true") {
      query.parentId = null;
    }

    // Full-text search
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    const sortOption = {};
    if (query.$text) {
      sortOption.score = { $meta: "textScore" };
    } else {
      sortOption[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalCount = await Issue.countDocuments(query);

    const issues = await Issue.find(query)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .populate("sprintId", "name status")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      issues,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get issue by ID or Key (e.g. CRM-101) with subtasks, comments, and activities
 */
const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === "[object Object]" || id === "undefined" || id === "null") {
      return res.status(400).json({ success: false, message: "Invalid issue ID or key" });
    }

    // Support flexible lookup by ObjectId, issue key (CRM-101), normalized key (CRM 101), or number (#101, 101)
    const rawId = String(id).trim();
    const projectId = req.query.projectId;

    let issue = null;

    // 1. Try ObjectId (strict 24-hex string)
    if (/^[0-9a-fA-F]{24}$/.test(rawId)) {
      issue = await Issue.findById(rawId);
    }

    // 2. Try exact Key match (case-insensitive)
    if (!issue) {
      issue = await Issue.findOne({
        key: new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
    }

    // 3. Try normalizing key separators (e.g. "CRM 101", "CRM#101", "CRM_101" -> "CRM-101")
    if (!issue && /^[a-zA-Z0-9]+[\s#_]+[0-9]+$/.test(rawId)) {
      const normalizedKey = rawId.replace(/[\s#_]+/, "-").toUpperCase();
      issue = await Issue.findOne({ key: normalizedKey });
    }

    // 4. Try numeric-only ID (e.g. "101" or "#101")
    const numOnly = rawId.replace(/^#/, "").trim();
    if (!issue && /^\d+$/.test(numOnly)) {
      if (projectId) {
        issue = await Issue.findOne({
          projectId,
          key: new RegExp(`-${numOnly}$`, "i"),
        });
      }
      if (!issue) {
        issue = await Issue.findOne({
          key: new RegExp(`-${numOnly}$`, "i"),
        });
      }
    }

    // 5. Try matching project key + number if projectId is provided
    if (!issue && projectId) {
      const project = await Project.findById(projectId);
      if (project && project.key) {
        issue = await Issue.findOne({
          projectId: project._id,
          key: new RegExp(`^${project.key}-${numOnly}$`, "i"),
        });
      }
    }

    // 6. Try title search in current project if projectId is provided
    if (!issue && projectId && rawId.length >= 2) {
      issue = await Issue.findOne({
        projectId,
        title: new RegExp(rawId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      });
    }

    if (!issue) {
      return res.status(404).json({ success: false, message: `Issue "${rawId}" not found` });
    }

    await issue.populate([
      { path: "assigneeId", select: "name email avatar" },
      { path: "reporterId", select: "name email avatar" },
      { path: "sprintId", select: "name status startDate endDate" },
      { path: "watchers", select: "name email avatar" },
      { path: "parentId", select: "key title status" },
    ]);

    // Load subtasks
    const subtasks = await Issue.find({ parentId: issue._id })
      .populate("assigneeId", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    // Load comments
    const comments = await Comment.find({ issueId: issue._id })
      .populate("authorId", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    // Load activity timeline
    const activities = await activityService.getIssueActivities(issue._id, 30);

    // Load time logs total
    const timeLogs = await TimeLog.find({ issueId: issue._id })
      .populate("userId", "name email avatar")
      .sort({ date: -1 })
      .lean();

    const totalMinutesLogged = timeLogs.reduce((acc, t) => acc + (t.minutes || 0), 0);

    res.status(200).json({
      success: true,
      issue,
      subtasks,
      comments,
      activities,
      timeLogs,
      totalMinutesLogged,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update issue fields
 */
const updateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid issue ID format" });
    }
    const updates = req.body;
    const userId = req.user.userId;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    // Guest users cannot update issues
    if (await isUserGuest(userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Task modifications are not permitted.",
      });
    }

    const previousIssue = issue.toObject();
    const diff = {};

    // Manager-oriented fields that employees cannot modify on root tasks
    const managerFields = [
      "title",
      "description",
      "type",
      "status",
      "priority",
      "assigneeId",
      "sprintId",
      "estimate",
      "dueDate",
      "startDate",
    ];

    const isUpdatingManagerField = managerFields.some(
      (f) => updates[f] !== undefined && String(updates[f] || "") !== String(issue[f] || "")
    );

    if (!issue.parentId && isUpdatingManagerField) {
      const isManager = await isUserManager(userId, issue.projectId);
      if (!isManager) {
        return res.status(403).json({
          success: false,
          message:
            "Only Project Managers can modify task details (title, description, assignee, sprint, estimate, or due date). Employees can manage subtasks, attachments, pull requests, and comments.",
        });
      }
    }

    const mutableFields = [
      "title",
      "description",
      "type",
      "status",
      "priority",
      "assigneeId",
      "sprintId",
      "estimate",
      "labels",
      "dueDate",
      "startDate",
      "tasks",
    ];

    mutableFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (String(issue[field]) !== String(updates[field])) {
          diff[field] = { from: issue[field], to: updates[field] };
        }
        issue[field] = updates[field];
      }
    });

    await issue.save();

    const populatedIssue = await Issue.findById(id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .populate("sprintId", "name status");

    // Log Activity if diff exists
    if (Object.keys(diff).length > 0) {
      await activityService.logActivity({
        projectId: issue.projectId,
        issueId: issue._id,
        actorId: userId,
        action: diff.status ? "STATUS_CHANGED" : diff.assigneeId ? "ASSIGNED" : "ISSUE_UPDATED",
        diff,
      });
    }

    // Trigger automations for status or priority changes
    if (diff.status) {
      await automationService.triggerAutomations("STATUS_CHANGED", {
        projectId: issue.projectId,
        issue: populatedIssue,
        previousIssue,
        actorId: userId,
      });
    }
    if (diff.priority) {
      await automationService.triggerAutomations("PRIORITY_CHANGED", {
        projectId: issue.projectId,
        issue: populatedIssue,
        previousIssue,
        actorId: userId,
      });
    }

    // Notify new assignee if changed
    if (diff.assigneeId && updates.assigneeId && updates.assigneeId.toString() !== userId.toString()) {
      await notificationService.createNotification({
        userId: updates.assigneeId,
        type: "ASSIGNMENT",
        title: `Assigned: ${issue.key}`,
        message: `You were assigned to ${issue.key}: "${issue.title}"`,
        payload: {
          projectId: issue.projectId,
          issueId: issue._id,
          issueKey: issue.key,
          senderId: userId,
        },
      });
    }

    // Broadcast real-time update
    socketService.emitToProject(issue.projectId, "issue.updated", populatedIssue);
    socketService.emitToIssue(issue._id, "issue.updated", populatedIssue);

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      issue: populatedIssue,
      diff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move issue between columns / reorder within column (Drag and Drop)
 */
const moveIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid issue ID format" });
    }
    const { status, prevIssueId = null, nextIssueId = null, sprintId } = req.body;
    const userId = req.user.userId;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    if (await isUserGuest(userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Moving tasks or updating status is restricted.",
      });
    }

    let prevRank = null;
    let nextRank = null;

    if (prevIssueId) {
      const prevIssue = await Issue.findById(prevIssueId).select("rank");
      prevRank = prevIssue?.rank || null;
    }
    if (nextIssueId) {
      const nextIssue = await Issue.findById(nextIssueId).select("rank");
      nextRank = nextIssue?.rank || null;
    }

    const newRank = between(prevRank, nextRank);
    const oldStatus = issue.status;

    issue.rank = newRank;
    if (status) issue.status = status;
    if (sprintId !== undefined) issue.sprintId = sprintId || null;

    await issue.save();

    const populatedIssue = await Issue.findById(id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar");

    // Log Activity
    const diff = { rank: { from: issue.rank, to: newRank } };
    if (oldStatus !== status) {
      diff.status = { from: oldStatus, to: status };
    }

    await activityService.logActivity({
      projectId: issue.projectId,
      issueId: issue._id,
      actorId: userId,
      action: oldStatus !== status ? "STATUS_CHANGED" : "ISSUE_MOVED",
      diff,
    });

    if (oldStatus !== status) {
      await automationService.triggerAutomations("STATUS_CHANGED", {
        projectId: issue.projectId,
        issue: populatedIssue,
        actorId: userId,
      });
    }

    // Broadcast real-time move event
    socketService.emitToProject(issue.projectId, "issue.moved", populatedIssue);
    socketService.emitToBoard(issue.projectId, "issue.moved", populatedIssue);

    res.status(200).json({
      success: true,
      message: "Issue moved successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete issue
 */
const deleteIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid issue ID format" });
    }
    const userId = req.user.userId;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    // Guest users cannot delete issues
    if (await isUserGuest(userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Deleting tasks is restricted.",
      });
    }

    // Root tasks can only be deleted by Project Managers
    if (!issue.parentId) {
      const isManager = await isUserManager(userId, issue.projectId);
      if (!isManager) {
        return res.status(403).json({
          success: false,
          message: "Only Project Managers can delete tasks.",
        });
      }
    }

    const projectId = issue.projectId;
    const issueKey = issue.key;

    // Delete subtasks, comments, timeLogs
    await Issue.deleteMany({ parentId: issue._id });
    await Comment.deleteMany({ issueId: issue._id });
    await TimeLog.deleteMany({ issueId: issue._id });
    await Issue.findByIdAndDelete(id);

    // Log activity
    await activityService.logActivity({
      projectId,
      actorId: userId,
      action: "ISSUE_DELETED",
      diff: { key: issueKey, title: issue.title },
    });

    socketService.emitToProject(projectId, "issue.deleted", { issueId: id, key: issueKey });

    res.status(200).json({
      success: true,
      message: `Issue ${issueKey} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload attachment to issue
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    if (await isUserGuest(req.user.userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Uploading task attachments is restricted.",
      });
    }

    const fileUrl = `/uploads/${file.filename}`;

    const attachment = {
      name: file.originalname,
      url: fileUrl,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user.userId,
      uploadedAt: new Date(),
    };

    issue.attachments.push(attachment);
    await issue.save();

    await activityService.logActivity({
      projectId: issue.projectId,
      issueId: issue._id,
      actorId: req.user.userId,
      action: "ATTACHMENT_ADDED",
      diff: { fileName: file.originalname },
    });

    socketService.emitToIssue(issue._id, "attachment.added", { issueId: issue._id, attachment });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      attachment,
      attachments: issue.attachments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update issues
 */
const bulkUpdateIssues = async (req, res, next) => {
  try {
    const { issueIds, updates } = req.body;
    const userId = req.user.userId;

    if (await isUserGuest(userId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Bulk updating tasks is restricted.",
      });
    }

    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return res.status(400).json({ success: false, message: "issueIds array is required" });
    }

    const allowedFields = ["status", "priority", "assigneeId", "sprintId"];
    const sanitizedUpdates = {};
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field] || null;
      }
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await Issue.updateMany(
      { _id: { $in: issueIds } },
      { $set: sanitizedUpdates }
    );

    const updatedIssues = await Issue.find({ _id: { $in: issueIds } })
      .populate("assigneeId", "name email avatar")
      .populate("sprintId", "name status");

    // Broadcast each updated issue to project
    if (updatedIssues.length > 0) {
      const projectId = updatedIssues[0].projectId;
      updatedIssues.forEach((iss) => {
        socketService.emitToProject(projectId, "issue.updated", iss);
      });
    }

    res.status(200).json({
      success: true,
      message: `${updatedIssues.length} issues updated successfully`,
      updatedCount: updatedIssues.length,
      issues: updatedIssues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete issues
 */
const bulkDeleteIssues = async (req, res, next) => {
  try {
    const { issueIds } = req.body;
    const userId = req.user.userId;

    if (await isUserGuest(userId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Bulk deleting tasks is restricted.",
      });
    }

    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return res.status(400).json({ success: false, message: "issueIds array is required" });
    }

    // Cascade delete subtasks, comments, timeLogs
    await Issue.deleteMany({ parentId: { $in: issueIds } });
    await Comment.deleteMany({ issueId: { $in: issueIds } });
    await TimeLog.deleteMany({ issueId: { $in: issueIds } });

    const issuesToDelete = await Issue.find({ _id: { $in: issueIds } }).select("projectId key");
    const result = await Issue.deleteMany({ _id: { $in: issueIds } });

    if (issuesToDelete.length > 0) {
      const projectId = issuesToDelete[0].projectId;
      issuesToDelete.forEach((iss) => {
        socketService.emitToProject(projectId, "issue.deleted", { issueId: iss._id, key: iss.key });
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} issues deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Raise / Link a Pull Request to a task/issue (Employees or Managers)
 */
const raisePullRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url, branch = "", targetBranch = "main", notes = "" } = req.body;
    const userId = req.user.userId;

    if (!title || !title.trim() || !url || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: "Pull request title and URL are required",
      });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Task/Issue not found" });
    }

    if (await isUserGuest(userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Raising pull requests is restricted to team members.",
      });
    }

    const user = await User.findById(userId);

    const newPr = {
      title: title.trim(),
      url: url.trim(),
      branch: branch ? branch.trim() : "",
      targetBranch: targetBranch ? targetBranch.trim() : "main",
      status: "OPEN",
      authorId: userId,
      authorName: user?.name || "Employee",
      notes: notes ? notes.trim() : "",
      createdAt: new Date(),
    };

    issue.pullRequests.push(newPr);

    // Jira Workflow: If task is in "To Do" or "Backlog", move to "In Progress" or "Review"
    let statusTransitioned = false;
    if (issue.status === "To Do" || issue.status === "Backlog") {
      issue.status = "In Progress";
      statusTransitioned = true;
    }

    await issue.save();

    // Log Activity
    await activityService.logActivity({
      projectId: issue.projectId,
      issueId: issue._id,
      actorId: userId,
      action: "PR_RAISED",
      diff: {
        prTitle: newPr.title,
        url: newPr.url,
        branch: newPr.branch,
        autoMovedStatus: statusTransitioned ? "In Progress" : null,
      },
    });

    // Notify Reporter / Assignee / Manager
    try {
      const notifyUserId =
        issue.assigneeId && issue.assigneeId.toString() !== userId.toString()
          ? issue.assigneeId
          : issue.reporterId;

      if (notifyUserId && notifyUserId.toString() !== userId.toString()) {
        await notificationService.createNotification({
          userId: notifyUserId,
          type: "STATUS_CHANGE",
          title: `Pull Request Raised on ${issue.key}`,
          message: `${user?.name || "An employee"} raised a PR: "${newPr.title}" for ${issue.key}`,
          payload: {
            projectId: issue.projectId,
            issueId: issue._id,
            issueKey: issue.key,
            senderId: userId,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Could not dispatch PR notification:", notifErr.message);
    }

    const populatedIssue = await Issue.findById(issue._id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .populate("sprintId", "name status");

    socketService.emitToProject(issue.projectId, "issue.updated", populatedIssue);
    socketService.emitToIssue(issue._id, "issue.updated", populatedIssue);

    res.status(201).json({
      success: true,
      message: `Pull request "${newPr.title}" linked to ${issue.key}`,
      issue: populatedIssue,
      pullRequest: newPr,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Pull Request status (e.g. mark as MERGED or CLOSED)
 */
const updatePullRequest = async (req, res, next) => {
  try {
    const { id, prId } = req.params;
    const { status, title, url, branch, targetBranch, notes } = req.body;
    const userId = req.user.userId;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Task/Issue not found" });
    }

    if (await isUserGuest(userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Modifying pull requests is restricted.",
      });
    }

    const pr = issue.pullRequests.id(prId);
    if (!pr) {
      return res.status(404).json({ success: false, message: "Pull request not found on this issue" });
    }

    const prevStatus = pr.status;
    if (status && ["OPEN", "MERGED", "CLOSED"].includes(status)) {
      pr.status = status;
      if (status === "MERGED" && !pr.mergedAt) {
        pr.mergedAt = new Date();
      }
    }
    if (title) pr.title = title.trim();
    if (url) pr.url = url.trim();
    if (branch !== undefined) pr.branch = branch.trim();
    if (targetBranch !== undefined) pr.targetBranch = targetBranch.trim();
    if (notes !== undefined) pr.notes = notes.trim();

    if (status === "MERGED" && prevStatus !== "MERGED") {
      await activityService.logActivity({
        projectId: issue.projectId,
        issueId: issue._id,
        actorId: userId,
        action: "PR_MERGED",
        diff: { prTitle: pr.title, branch: pr.branch, mergedAt: pr.mergedAt },
      });
    }

    await issue.save();

    const populatedIssue = await Issue.findById(issue._id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .populate("sprintId", "name status");

    socketService.emitToProject(issue.projectId, "issue.updated", populatedIssue);
    socketService.emitToIssue(issue._id, "issue.updated", populatedIssue);

    res.status(200).json({
      success: true,
      message: `Pull request status updated to ${pr.status}`,
      issue: populatedIssue,
      pullRequest: pr,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove linked pull request
 */
const deletePullRequest = async (req, res, next) => {
  try {
    const { id, prId } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Task/Issue not found" });
    }

    if (await isUserGuest(req.user.userId, issue.projectId)) {
      return res.status(403).json({
        success: false,
        message: "Guest users have read-and-comment access only. Deleting pull requests is restricted.",
      });
    }

    issue.pullRequests = issue.pullRequests.filter((p) => p._id.toString() !== prId.toString());
    await issue.save();

    const populatedIssue = await Issue.findById(issue._id)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .populate("sprintId", "name status");

    socketService.emitToProject(issue.projectId, "issue.updated", populatedIssue);
    socketService.emitToIssue(issue._id, "issue.updated", populatedIssue);

    res.status(200).json({
      success: true,
      message: "Pull request unlinked successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  moveIssue,
  deleteIssue,
  uploadAttachment,
  bulkUpdateIssues,
  bulkDeleteIssues,
  raisePullRequest,
  updatePullRequest,
  deletePullRequest,
  isUserManager,
  isUserGuest,
};
