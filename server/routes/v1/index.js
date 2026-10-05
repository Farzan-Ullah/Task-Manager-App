const express = require("express");
const router = express.Router();

const workspaceRoutes = require("./workspaces");
const projectRoutes = require("./projects");
const boardRoutes = require("./boards");
const issueRoutes = require("./issues");
const commentRoutes = require("./comments");
const sprintRoutes = require("./sprints");
const timeLogRoutes = require("./timeLogs");
const reportRoutes = require("./reports");
const automationRoutes = require("./automations");
const notificationRoutes = require("./notifications");

router.use("/workspaces", workspaceRoutes);
router.use("/projects", projectRoutes);
router.use("/boards", boardRoutes);
router.use("/issues", issueRoutes);
router.use("/comments", commentRoutes);
router.use("/sprints", sprintRoutes);
router.use("/time-logs", timeLogRoutes);
router.use("/reports", reportRoutes);
router.use("/automations", automationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/auth", require("../user"));

module.exports = router;
