const User = require("../models/user");
const Workspace = require("../models/workspace");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ errorMessage: "Bad Request!" });
    }

    const isExistingUser = await User.findOne({ email: email });
    if (isExistingUser) {
      return res
        .status(400)
        .json({ errorMessage: "User with same email already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let workspaceId;
    let role = "Employee";

    if (inviteCode) {
      const workspace = await Workspace.findOne({ inviteCode });
      if (!workspace) {
        return res.status(400).json({ errorMessage: "Invalid invite code!" });
      }
      workspaceId = workspace._id;
    } else {
      // Create new workspace
      const newInviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const workspace = new Workspace({
        name: `${name}'s Workspace`,
        inviteCode: newInviteCode,
        owner: new mongoose.Types.ObjectId(), // Placeholder, updated below
      });
      await workspace.save();
      workspaceId = workspace._id;
      role = "Admin";
    }

    const userData = new User({
      name,
      email,
      password: hashedPassword,
      role,
      workspace: workspaceId,
    });
    
    await userData.save();
    
    if (!inviteCode) {
      await Workspace.findByIdAndUpdate(workspaceId, { owner: userData._id });
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

    const token = jwt.sign(
      {
        userId: userData._id,
        email: userData.email,
        role: userData.role,
        workspaceId: userData.workspace,
      },
      process.env.SECRET_KEY,
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
    console.log(error);
    res.status(500).json({
      errorMessage: "Something went wrong",
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

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
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
    const token = jwt.sign(
      { email: user.email, _id: user._id },
      process.env.SECRET_KEY,
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

module.exports = {
  registerUser,
  loginUser,
  logOutUser,
  updateUserProfile,
  addAssigneeByEmail,
  getAllAssignees,
  getAllUsers,
};
