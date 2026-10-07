const User = require("../models/user");
const Workspace = require("../models/workspace");
const Project = require("../models/project");
const Board = require("../models/board");
const Counter = require("../models/counter");
const notificationService = require("../services/notificationService");
const socketService = require("../services/socketService");
let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch (e) {
  bcrypt = require("bcrypt");
}
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ errorMessage: "Bad Request!" });
    }

    const isExistingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (isExistingUser) {
      return res
        .status(400)
        .json({ errorMessage: "User with same email already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanEmail = email.toLowerCase().trim();

    if (inviteCode && inviteCode.trim()) {
      const cleanCode = inviteCode.trim().toUpperCase();
      const workspace = await Workspace.findOne({ inviteCode: cleanCode });
      if (!workspace) {
        return res.status(400).json({ errorMessage: "Invalid invite code!" });
      }

      const isJoiningGuest = req.body.role === "Guest" || req.body.isGuest === true;
      const role = isJoiningGuest ? "Guest" : "Employee";
      const wkspRole = isJoiningGuest ? "Guest" : "Member";

      const userData = new User({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role,
        workspace: workspace._id,
        workspaces: [{ workspaceId: workspace._id, role: wkspRole }],
      });
      await userData.save();

      // Add to workspace.members
      workspace.members.push({
        userId: userData._id,
        role: wkspRole,
        status: "ACTIVE",
        joinedAt: new Date(),
      });
      await workspace.save();

      // Automatically add to all existing projects in this workspace so user appears in assignees
      await Project.updateMany(
        { workspaceId: workspace._id },
        { $addToSet: { members: { userId: userData._id, role: wkspRole } } }
      );

      // Create notification for workspace owner
      try {
        await notificationService.createNotification({
          userId: workspace.owner,
          type: "INVITATION",
          title: "New Team Member Joined",
          message: `${name.trim()} (${cleanEmail}) joined your workspace via invite code.`,
          payload: { workspaceId: workspace._id, senderId: userData._id },
        });
      } catch (notifyErr) {
        console.warn("Could not dispatch join notification:", notifyErr.message);
      }

      // Emit socket event to workspace
      try {
        socketService.emitToWorkspace(workspace._id, "member.added", {
          workspaceId: workspace._id,
          user: {
            _id: userData._id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            role: wkspRole,
          },
        });
      } catch (sockErr) {
        console.warn("Could not emit member.added socket:", sockErr.message);
      }
    } else {
      // Create new workspace
      const newInviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const role = "Admin";
      const wkspRole = "Workspace Admin";
      const tempId = new mongoose.Types.ObjectId();

      const workspace = new Workspace({
        name: `${name.trim()}'s Workspace`,
        inviteCode: newInviteCode,
        owner: tempId,
        members: [
          {
            userId: tempId,
            role: wkspRole,
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        ],
      });
      await workspace.save();

      const userData = new User({
        _id: tempId,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role,
        workspace: workspace._id,
        workspaces: [{ workspaceId: workspace._id, role: wkspRole }],
      });
      await userData.save();

      // Create default Project and Board
      const project = new Project({
        workspaceId: workspace._id,
        key: "PROJ",
        name: "Main Project",
        description: "Primary workspace project",
        leadId: userData._id,
        members: [{ userId: userData._id, role: "Project Manager" }],
      });
      await project.save();

      const board = new Board({
        projectId: project._id,
        name: "Kanban Board",
      });
      await board.save();

      await Counter.create({
        projectId: project._id,
        seq: 100,
      });
    }

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      errorMessage: "Something went wrong",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ errorMessage: "Bad Request!" });
    }

    const userData = await User.findOne({ email: email });
    if (!userData) {
      return res.status(400).json({ errorMessage: "User does not exist!" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ errorMessage: "Incorrect password or email!" });
    }

    const secret = process.env.SECRET_KEY || "default_pro_manage_fallback_secret_key_2026";
    const token = jwt.sign(
      {
        userId: userData._id,
        email: userData.email,
        role: userData.role,
        workspaceId: userData.workspace,
      },
      secret,
      { expiresIn: "60h" }
    );

    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    res.json({
      success: true,
      message: "User logged in",
      token: token,
      name: userData.name,
      email: userData.email,
      userId: userData._id,
      role: userData.role,
      workspaceId: userData.workspace,
    });
  } catch (error) {
    console.error("Login controller error:", error);
    res.status(500).json({
      errorMessage: error.message || "Something went wrong during login",
    });
  }
};

const logOutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      success: true,
      message: "user loggedout successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token payload",
      });
    }

    const user = await User.findById(userId).select("name email role avatar workspace workspaces");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        userId: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        workspaceId: user.workspace,
        workspaces: user.workspaces || [],
      },
    });
  } catch (error) {
    console.error("getMe controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error fetching user profile",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.params.userId;
    console.log("Updating user profile for userId:", userId);
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }
    if (newPassword) {
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid current password",
        });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
    }

    await user.save();
    const secret = process.env.SECRET_KEY || "default_pro_manage_fallback_secret_key_2026";
    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspace,
      },
      secret,
      { expiresIn: "60h" }
    );
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      name: user.name,
      email: user.email,
      userId: user._id,
      _id: user._id,
      role: user.role,
      workspaceId: user.workspace,
      token: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

const addAssigneeByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const assignee = await User.findOne({ email });
    if (!assignee) {
      return res.json({ success: false, message: "Assignee not found" });
    }

    if (assignee.workspace.toString() !== user.workspace.toString()) {
      return res.json({ success: false, message: "User is not in your workspace" });
    }

    if (user.assignees.includes(assignee._id)) {
      return res
        .status(200)
        .json({ success: true, message: "Assignee already added" });
    }

    user.assignees.push(assignee._id);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Assignee added successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

const getAllAssignees = async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming req.user is populated with the authenticated user's info
    const user = await User.findById(userId).populate(
      "assignees",
      "name email"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      assignees: user.assignees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

const getAllUsers = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const users = await User.find({ workspace: workspaceId }, "name email role");
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ errorMessage: "Please provide your email address" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ errorMessage: "No account found with this email address" });
    }

    // Generate cryptographically secure 32-byte token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token for database storage
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour validity
    await user.save();

    // Construct reset link based on client origin
    const origin = req.headers.origin || "http://localhost:5173";
    const resetUrl = `${origin}/reset-password/${resetToken}`;

    console.log(`[AUTH] Password reset requested for: ${user.email}`);
    console.log(`[AUTH] Reset URL: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: "Password reset instructions have been generated. Use the link to reset your password within 1 hour.",
      resetToken,
      resetUrl,
      email: user.email,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ errorMessage: "Failed to process forgot password request" });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ errorMessage: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        errorMessage: "Password reset link is invalid or has expired. Please request a new one.",
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      email: user.email,
      message: "Reset token is valid",
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({ errorMessage: "Error verifying reset token" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ errorMessage: "Reset token is required" });
    }

    if (!password) {
      return res.status(400).json({ errorMessage: "Please enter a new password" });
    }

    if (password.length < 6) {
      return res.status(400).json({ errorMessage: "Password must be at least 6 characters long" });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ errorMessage: "Passwords do not match" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        errorMessage: "Password reset link is invalid or has expired. Please request a new one.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`[AUTH] Password successfully reset for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ errorMessage: "Failed to reset password" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logOutUser,
  getMe,
  updateUserProfile,
  addAssigneeByEmail,
  getAllAssignees,
  getAllUsers,
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
