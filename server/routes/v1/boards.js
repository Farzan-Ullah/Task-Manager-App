const express = require("express");
const router = express.Router();
const boardCtrl = require("../../controllers/v1/boardController");
const { verifyToken } = require("../../middlewares/TokenVerification");

router.use(verifyToken);

router.get("/:projectId", boardCtrl.getBoardByProject);
router.patch("/:id/columns", boardCtrl.updateColumns);

module.exports = router;
