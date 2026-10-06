const { Workspace, Project, Sprint, Issue, Automation, Board } = require("../models");

/**
 * Check if the authenticated user has one of the allowed roles in the workspace
 * @param {string[]} allowedRoles - e.g. ["Workspace Admin", "Project Manager", "Member"]
 */
function requireWorkspaceRole(allowedRoles = ["Workspace Admin", "Project Manager", "Member"]) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }

      let workspaceId =
        req.params.workspaceId ||
        req.headers["x-workspace-id"] ||
        req.body.workspaceId ||
        req.query.workspaceId ||
        req.user.workspaceId;

      // System Admin superuser access
      if (req.user?.role === "Admin") {
        req.userWorkspaceRole = "Workspace Admin";
        if (workspaceId) {
          workspace = await Workspace.findById(workspaceId);
          req.workspace = workspace;
        }
        return next();
      }

      let workspace = null;
      if (workspaceId) {
        workspace = await Workspace.findById(workspaceId);
      }

      if (!workspace && req.params.id) {
        workspace = await Workspace.findById(req.params.id);
      }

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: "Workspace not found",
          code: "WORKSPACE_NOT_FOUND",
        });
      }

      // Check if user is owner -> auto Workspace Admin
      if (workspace.owner.toString() === userId.toString()) {
        req.workspace = workspace;
        req.userWorkspaceRole = "Workspace Admin";
        return next();
      }

      // Check members list
      const member = workspace.members.find(
        (m) => m.userId.toString() === userId.toString() && m.status === "ACTIVE"
      );

      if (!member) {
        return res.status(403).json({
          success: false,
          message: "You are not an active member of this workspace",
          code: "NOT_WORKSPACE_MEMBER",
        });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          message: `Action requires one of the following workspace roles: ${allowedRoles.join(", ")}`,
          code: "FORBIDDEN_WORKSPACE_ROLE",
        });
      }

      req.workspace = workspace;
      req.userWorkspaceRole = member.role;
      return next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if the authenticated user has one of the allowed roles for a project
 * @param {string[]} allowedRoles - e.g. ["Project Manager", "Member"]
 */
function requireProjectRole(allowedRoles = ["Project Manager", "Member"]) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }

      let projectId =
        req.params.projectId ||
        req.body.projectId ||
        req.query.projectId;

      let project = null;

      if (projectId) {
        project = await Project.findById(projectId);
      } else if (req.query.sprintId || req.body.sprintId) {
        const sprint = await Sprint.findById(req.query.sprintId || req.body.sprintId);
        if (sprint) {
          project = await Project.findById(sprint.projectId);
        }
      } else if (req.query.issueId || req.body.issueId) {
        const issue = await Issue.findById(req.query.issueId || req.body.issueId);
        if (issue) {
          project = await Project.findById(issue.projectId);
        }
      } else if (req.params.id) {
        // Try finding project directly
        project = await Project.findById(req.params.id);
        if (!project) {
          // Check if req.params.id is a sprint
          const sprint = await Sprint.findById(req.params.id);
          if (sprint) {
            project = await Project.findById(sprint.projectId);
          } else {
            // Check if req.params.id is an issue
            const issue = await Issue.findById(req.params.id);
            if (issue) {
              project = await Project.findById(issue.projectId);
            } else {
              // Check if req.params.id is an automation rule
              const automation = await Automation.findById(req.params.id);
              if (automation) {
                project = await Project.findById(automation.projectId);
              } else {
                // Check if req.params.id is a board
                const board = await Board.findById(req.params.id);
                if (board) {
                  project = await Project.findById(board.projectId);
                }
              }
            }
          }
        }
      }

      // System Admin superuser access
      if (req.user?.role === "Admin") {
        req.userProjectRole = "Project Manager";
        if (project) {
          req.project = project;
          req.workspace = await Workspace.findById(project.workspaceId);
        }
        return next();
      }

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      // Check workspace role: Workspace Admin has superuser access
      const workspace = await Workspace.findById(project.workspaceId);
      if (workspace && (workspace.owner.toString() === userId.toString())) {
        req.project = project;
        req.workspace = workspace;
        req.userProjectRole = "Project Manager";
        return next();
      }

      const wkspMember = workspace?.members?.find(
        (m) => m.userId.toString() === userId.toString() && m.status === "ACTIVE"
      );

      if (wkspMember && wkspMember.role === "Workspace Admin") {
        req.project = project;
        req.workspace = workspace;
        req.userProjectRole = "Project Manager";
        return next();
      }

      // Project Lead is automatically Project Manager
      if (project.leadId.toString() === userId.toString()) {
        req.project = project;
        req.workspace = workspace;
        req.userProjectRole = "Project Manager";
        return next();
      }

      // Check project members list
      const projMember = project.members.find(
        (m) => m.userId.toString() === userId.toString()
      );

      if (!projMember) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this project",
          code: "NOT_PROJECT_MEMBER",
        });
      }

      if (!allowedRoles.includes(projMember.role)) {
        return res.status(403).json({
          success: false,
          message: `Action requires one of the following project roles: ${allowedRoles.join(", ")}`,
          code: "FORBIDDEN_PROJECT_ROLE",
        });
      }

      req.project = project;
      req.workspace = workspace;
      req.userProjectRole = projMember.role;
      return next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireWorkspaceRole,
  requireProjectRole,
};
