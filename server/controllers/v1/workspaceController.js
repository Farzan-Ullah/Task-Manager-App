const crypto = require("crypto");
const { Workspace, Project, Board, User } = require("../../models");
const notificationService = require("../../services/notificationService");
const socketService = require("../../services/socketService");

/**
 * Create a new workspace
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name, plan } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Workspace name is required" });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const workspace = new Workspace({
      name: name.trim(),
      owner: userId,
      inviteCode,
      plan: plan || "Free",
      members: [
        {
          userId,
          role: "Workspace Admin",
          status: "ACTIVE",
        },
      ],
    });

    await workspace.save();

    // Add to user's workspaces
    await User.findByIdAndUpdate(userId, {
      $addToSet: { workspaces: { workspaceId: workspace._id, role: "Workspace Admin" } },
      workspace: workspace._id,
    });

    // Create default Project and Board
    const project = new Project({
      workspaceId: workspace._id,
      key: "PROJ",
      name: "Main Project",
      description: "Default project for workspace",
      leadId: userId,
      members: [{ userId, role: "Project Manager" }],
    });
    await project.save();

    const board = new Board({
      projectId: project._id,
      name: "Kanban Board",
    });
    await board.save();

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
      defaultProject: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all workspaces for authenticated user
 */
const getUserWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const workspaces = await Workspace.find({
      $or: [{ owner: userId }, { "members.userId": userId }],
    })
      .populate("owner", "name email avatar")
      .populate("members.userId", "name email avatar")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get workspace details by ID
 */
const getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id)
      .populate("owner", "name email avatar")
      .populate("members.userId", "name email avatar");

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    const projects = await Project.find({ workspaceId: id })
      .populate("leadId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      workspace,
      projects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update workspace settings or name
 */
const updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, settings, plan } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    if (name) workspace.name = name.trim();
    if (plan) workspace.plan = plan;
    if (settings) {
      workspace.settings = { ...workspace.settings, ...settings };
    }

    await workspace.save();

    socketService.emitToWorkspace(workspace._id, "workspace.updated", workspace);

    res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invite user to workspace by email
 */
const inviteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role = "Member" } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Role check: Only Workspace Owner or Workspace Admin can invite members
    const requesterId = req.user?.userId;
    const isOwner = workspace.owner.toString() === requesterId?.toString();
    const requesterMember = workspace.members.find(
      (m) => m.userId.toString() === requesterId?.toString() && m.status === "ACTIVE"
    );
    if (!isOwner && requesterMember?.role !== "Workspace Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Workspace Admins or the Workspace Owner can invite team members",
      });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email. Ask them to register first.",
      });
    }

    // Check if already a member
    const existingMember = workspace.members.find(
      (m) => m.userId.toString() === userToInvite._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this workspace",
      });
    }

    workspace.members.push({
      userId: userToInvite._id,
      role,
      status: "ACTIVE",
    });

    // Update user's workspaces
    await User.findByIdAndUpdate(userToInvite._id, {
      $addToSet: { workspaces: { workspaceId: workspace._id, role } },
      ...(!userToInvite.workspace && { workspace: workspace._id }),
    });

    // Automatically add to existing projects in the workspace so they appear as assignees
    await Project.updateMany(
      { workspaceId: workspace._id },
      { $addToSet: { members: { userId: userToInvite._id, role } } }
    );

    // Notify user
    await notificationService.createNotification({
      userId: userToInvite._id,
      type: "INVITATION",
      title: "Workspace Invitation",
      message: `You were added to workspace "${workspace.name}" as ${role}`,
      payload: {
        workspaceId: workspace._id,
        senderId: req.user.userId,
      },
    });

    socketService.emitToWorkspace(workspace._id, "member.added", {
      workspaceId: workspace._id,
      user: {
        _id: userToInvite._id,
        name: userToInvite.name,
        email: userToInvite.email,
        role,
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${email} added to workspace as ${role}`,
      members: workspace.members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from workspace
 */
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Role check: Only Workspace Owner or Workspace Admin can remove members
    const requesterId = req.user?.userId;
    const isOwner = workspace.owner.toString() === requesterId?.toString();
    const requesterMember = workspace.members.find(
      (m) => m.userId.toString() === requesterId?.toString() && m.status === "ACTIVE"
    );
    if (!isOwner && requesterMember?.role !== "Workspace Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Workspace Admins or the Workspace Owner can remove members",
      });
    }

    if (workspace.owner.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot remove workspace owner" });
    }

    workspace.members = workspace.members.filter(
      (m) => m.userId.toString() !== userId.toString()
    );
    await workspace.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { workspaces: { workspaceId: workspace._id } },
    });

    socketService.emitToWorkspace(workspace._id, "member.removed", {
      workspaceId: workspace._id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: "Member removed from workspace",
      members: workspace.members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update member role in workspace
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    const allowed = ["Workspace Admin", "Project Manager", "Member", "Guest"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Role check: Only Workspace Owner or Workspace Admin can update member roles
    const requesterId = req.user?.userId;
    const isOwner = workspace.owner.toString() === requesterId?.toString();
    const requesterMember = workspace.members.find(
      (m) => m.userId.toString() === requesterId?.toString() && m.status === "ACTIVE"
    );
    if (!isOwner && requesterMember?.role !== "Workspace Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Workspace Admins or the Workspace Owner can update member roles",
      });
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === userId.toString()
    );

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found in workspace" });
    }

    member.role = role;
    await workspace.save();

    await User.updateOne(
      { _id: userId, "workspaces.workspaceId": workspace._id },
      { $set: { "workspaces.$.role": role } }
    );

    socketService.emitToWorkspace(workspace._id, "member.updated", {
      workspaceId: workspace._id,
      userId,
      role,
    });

    res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      members: workspace.members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Switch active workspace for user
 */
const switchWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    await User.findByIdAndUpdate(userId, { workspace: workspace._id });

    res.status(200).json({
      success: true,
      message: `Active workspace switched to "${workspace.name}"`,
      activeWorkspaceId: workspace._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all members/employees of a workspace
 */
const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id)
      .populate("owner", "name email avatar role")
      .populate("members.userId", "name email avatar role");

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Also query users having this workspace to guarantee 100% coverage
    const usersWithWksp = await User.find(
      { $or: [{ workspace: id }, { "workspaces.workspaceId": id }] },
      "name email avatar role createdAt"
    );

    const membersMap = new Map();

    // 1. Process members from workspace.members array
    if (workspace.members && Array.isArray(workspace.members)) {
      for (const m of workspace.members) {
        if (m.userId) {
          const u = m.userId;
          membersMap.set(u._id.toString(), {
            _id: u._id,
            name: u.name,
            email: u.email,
            avatar: u.avatar || "",
            role: m.role || "Member",
            status: m.status || "ACTIVE",
            joinedAt: m.joinedAt,
          });
        }
      }
    }

    // 2. Ensure owner is present
    if (workspace.owner && !membersMap.has(workspace.owner._id.toString())) {
      membersMap.set(workspace.owner._id.toString(), {
        _id: workspace.owner._id,
        name: workspace.owner.name,
        email: workspace.owner.email,
        avatar: workspace.owner.avatar || "",
        role: "Workspace Admin",
        status: "ACTIVE",
        joinedAt: workspace.createdAt,
      });
    }

    // 3. Merge any additional users linked via User document
    for (const u of usersWithWksp) {
      if (!membersMap.has(u._id.toString())) {
        const isOwner = workspace.owner && workspace.owner._id.toString() === u._id.toString();
        const role = isOwner ? "Workspace Admin" : (u.role === "Admin" ? "Workspace Admin" : "Member");
        membersMap.set(u._id.toString(), {
          _id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || "",
          role,
          status: "ACTIVE",
          joinedAt: u.createdAt,
        });

        // Self-heal workspace document
        workspace.members.push({
          userId: u._id,
          role,
          status: "ACTIVE",
          joinedAt: u.createdAt || new Date(),
        });
      }
    }

    // Save if self-healed
    if (workspace.isModified("members")) {
      await workspace.save();
    }

    const membersList = Array.from(membersMap.values());

    res.status(200).json({
      success: true,
      workspaceName: workspace.name,
      inviteCode: workspace.inviteCode,
      owner: workspace.owner,
      members: membersList,
      totalCount: membersList.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  updateWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  switchWorkspace,
};
