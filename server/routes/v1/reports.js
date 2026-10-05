const express = require("express");
const router = express.Router();
const reportCtrl = require("../../controllers/v1/reportController");
const { verifyToken } = require("../../middlewares/TokenVerification");

router.use(verifyToken);

router.get("/burndown", reportCtrl.getBurndown);
router.get("/velocity", reportCtrl.getVelocity);
router.get("/cumulative-flow", reportCtrl.getCumulativeFlow);
router.get("/workload", reportCtrl.getWorkload);
router.get("/summary", reportCtrl.getProjectSummary);

module.exports = router;
