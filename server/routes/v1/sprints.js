const express = require("express");
const router = express.Router();
const sprintCtrl = require("../../controllers/v1/sprintController");
const { verifyToken } = require("../../middlewares/TokenVerification");
const { requireProjectRole } = require("../../middlewares/rbac");

router.use(verifyToken);

router.post("/", requireProjectRole(["Project Manager"]), sprintCtrl.createSprint);
router.get("/", sprintCtrl.getSprints);
router.get("/:id", sprintCtrl.getSprintById);
router.patch("/:id", requireProjectRole(["Project Manager"]), sprintCtrl.updateSprint);
router.post("/:id/start", requireProjectRole(["Project Manager"]), sprintCtrl.startSprint);
router.post("/:id/complete", requireProjectRole(["Project Manager"]), sprintCtrl.completeSprint);
router.delete("/:id", requireProjectRole(["Project Manager"]), sprintCtrl.deleteSprint);

module.exports = router;
