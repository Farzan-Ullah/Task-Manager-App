const express = require("express");
const router = express.Router();
const timeLogCtrl = require("../../controllers/v1/timeLogController");
const { verifyToken } = require("../../middlewares/TokenVerification");

router.use(verifyToken);

router.post("/", timeLogCtrl.createTimeLog);
router.get("/", timeLogCtrl.getTimeLogs);
router.get("/summary", timeLogCtrl.getTimesheetSummary);
router.delete("/:id", timeLogCtrl.deleteTimeLog);

module.exports = router;
