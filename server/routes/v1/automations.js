const express = require("express");
const router = express.Router();
const automationCtrl = require("../../controllers/v1/automationController");
const { verifyToken } = require("../../middlewares/TokenVerification");
const { requireProjectRole } = require("../../middlewares/rbac");

router.use(verifyToken);

router.post("/", requireProjectRole(["Project Manager"]), automationCtrl.createAutomation);
router.get("/", automationCtrl.getAutomations);
router.patch("/:id", requireProjectRole(["Project Manager"]), automationCtrl.updateAutomation);
router.delete("/:id", requireProjectRole(["Project Manager"]), automationCtrl.deleteAutomation);

module.exports = router;
