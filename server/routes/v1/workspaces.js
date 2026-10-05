const express = require("express");
const router = express.Router();
const workspaceCtrl = require("../../controllers/v1/workspaceController");
const { verifyToken } = require("../../middlewares/TokenVerification");
const { requireWorkspaceRole } = require("../../middlewares/rbac");

router.use(verifyToken);

router.post("/", workspaceCtrl.createWorkspace);
router.get("/", workspaceCtrl.getUserWorkspaces);
router.get("/:id", workspaceCtrl.getWorkspaceById);
router.patch("/:id", requireWorkspaceRole(["Workspace Admin"]), workspaceCtrl.updateWorkspace);
router.post("/:id/invite", requireWorkspaceRole(["Workspace Admin"]), workspaceCtrl.inviteMember);
router.delete("/:id/members/:userId", requireWorkspaceRole(["Workspace Admin"]), workspaceCtrl.removeMember);
router.patch("/:id/members/:userId/role", requireWorkspaceRole(["Workspace Admin"]), workspaceCtrl.updateMemberRole);
router.post("/:id/switch", workspaceCtrl.switchWorkspace);

module.exports = router;
