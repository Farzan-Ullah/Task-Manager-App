const express = require("express");
const router = express.Router();
const projectCtrl = require("../../controllers/v1/projectController");
const { verifyToken } = require("../../middlewares/TokenVerification");
const { requireWorkspaceRole, requireProjectRole } = require("../../middlewares/rbac");

router.use(verifyToken);

router.post("/", requireWorkspaceRole(["Workspace Admin", "Project Manager"]), projectCtrl.createProject);
router.get("/", projectCtrl.getWorkspaceProjects);
router.get("/:id", projectCtrl.getProjectById);
router.patch("/:id", requireProjectRole(["Project Manager"]), projectCtrl.updateProject);
router.post("/:id/members", requireProjectRole(["Project Manager"]), projectCtrl.addProjectMember);
router.delete("/:id/members/:userId", requireProjectRole(["Project Manager"]), projectCtrl.removeProjectMember);
router.get("/:id/board", projectCtrl.getProjectBoard);

module.exports = router;
