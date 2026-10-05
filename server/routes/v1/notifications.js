const express = require("express");
const router = express.Router();
const notificationCtrl = require("../../controllers/v1/notificationController");
const { verifyToken } = require("../../middlewares/TokenVerification");

router.use(verifyToken);

router.get("/", notificationCtrl.getNotifications);
router.patch("/:id/read", notificationCtrl.markRead);
router.patch("/read-all", notificationCtrl.markAllRead);

module.exports = router;
