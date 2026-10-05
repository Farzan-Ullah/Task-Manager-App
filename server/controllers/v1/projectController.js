const { Project, Board, Counter, Issue, Workspace } = require("../../models");
const socketService = require("../../services/socketService");

/**
 * Create a new project in workspace
 */
const createProject = async (req, res, next) => {
  try {
    const { workspaceId, key, name, description, leadId } = req.body;
    const userId = req.user.userId;

    if (!workspaceId || !key || !name) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID, project key, and project name are required",
      });
    }

    const cleanKey = key.trim().toUpperCase();

    // Verify key format: 2-10 letters
    if (!/^[A-Z0-9]{2,10}$/.test(cleanKey)) {
      return res.status(400).json({
        success: false,
        message: "Project key must be 2-10 alphanumeric uppercase characters (e.g. CRM, PROJ)",
      });
    }

    // Check unique key in workspace
    const existing = await Project.findOne({ workspaceId, key: cleanKey });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Project with key "${cleanKey}" already exists in this workspace`,
      });
    }

    const effectiveLeadId = leadId || userId;

    // Automatically include all current workspace members as project members
    const workspace = await Workspace.findById(workspaceId);
    const initialMembers = [];
    const addedUserIds = new Set();

    initialMembers.push({
      userId: effectiveLeadId,
      role: "Project Manager",
    });
    addedUserIds.add(effectiveLeadId.toString());

    if (workspace && Array.isArray(workspace.members)) {
      for (const m of workspace.members) {
        if (m.userId && !addedUserIds.has(m.userId.toString())) {
          initialMembers.push({
            userId: m.userId,
            role: "Member",
          });
          addedUserIds.add(m.userId.toString());
        }
      }
    }

    const project = new Project({
      workspaceId,
      key: cleanKey,
      name: name.trim(),
      description: description || "",
      leadId: effectiveLeadId,
      members: initialMembers,
    });

    await project.save();

    // Create default Kanban board
    const board = new Board({
      projectId: project._id,
      name: "Kanban Board",
    });
    await board.save();

    // Initialize sequence counter for issues
    await Counter.create({
      projectId: project._id,
      seq: 100,
    });

    socketService.emitToWorkspace(workspaceId, "project.created", project);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
      board,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all projects in workspace
 */
const getWorkspaceProjects = async (req, res, next) => {
  try {
    const workspaceId =
      req.query.workspaceId ||
      req.headers["x-workspace-id"] ||
      req.user.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required",
      });
    }

    const projects = await Project.find({ workspaceId })
      .populate("leadId", "name email avatar")
      .populate("members.userId", "name email avatar")
      .sort({ updatedAt: -1 });

    // Attach issue counts
    const projectList = await Promise.all(
      projects.map(async (p) => {
        const issueCount = await Issue.countDocuments({ projectId: p._id });
        const obj = p.toObject();
        obj.issueCount = issueCount;
        return obj;
      })
    );

    res.status(200).json({
      success: true,
      projects: projectList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project by ID
 */
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate("leadId", "name email avatar")
      .populate("members.userId", "name email avatar")
      .populate("workspaceId", "name plan");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const rawWorkspaceId = project.workspaceId?._id || project.workspaceId;
    const workspace = await Workspace.findById(rawWorkspaceId)
      .populate("members.userId", "name email avatar role");

    const board = await Board.findOne({ projectId: id });

    res.status(200).json({
      success: true,
      project,
      board,
      workspaceMembers: workspace?.members || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update project details
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, leadId, settings } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (leadId) project.leadId = leadId;
    if (settings) project.settings = { ...project.settings, ...settings };

    await project.save();

    socketService.emitToProject(project._id, "project.updated", project);

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to project
 */
const addProjectMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role = "Member" } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const exists = project.members.some((m) => m.userId.toString() === userId.toString());
    if (exists) {
      return res.status(400).json({ success: false, message: "User is already a project member" });
    }

    project.members.push({ userId, role });
    await project.save();

    const populated = await Project.findById(id).populate("members.userId", "name email avatar");

    socketService.emitToProject(project._id, "member.added", { projectId: id, userId, role });

    res.status(200).json({
      success: true,
      message: "Member added to project",
      members: populated.members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from project
 */
const removeProjectMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.leadId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot remove project lead" });
    }

    project.members = project.members.filter((m) => m.userId.toString() !== userId.toString());
    await project.save();

    socketService.emitToProject(project._id, "member.removed", { projectId: id, userId });

    res.status(200).json({
      success: true,
      message: "Member removed from project",
      members: project.members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project board with columns and ordered issues
 */
const getProjectBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sprintId } = req.query;

    const board = await Board.findOne({ projectId: id });
    if (!board) {
      return res.status(404).json({ success: false, message: "Board not found for project" });
    }

    const query = { projectId: id };
    if (sprintId === "backlog") {
      query.sprintId = null;
    } else if (sprintId) {
      query.sprintId = sprintId;
    }

    const issues = await Issue.find(query)
      .populate("assigneeId", "name email avatar")
      .populate("reporterId", "name email avatar")
      .sort({ rank: 1 });

    res.status(200).json({
      success: true,
      board,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  updateProject,
  addProjectMember,
  removeProjectMember,
  getProjectBoard,
};
