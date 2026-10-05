const express = require("express");
const router = express.Router();
const commentCtrl = require("../../controllers/v1/commentController");
const { verifyToken } = require("../../middlewares/TokenVerification");

router.use(verifyToken);

router.patch("/:id", commentCtrl.updateComment);
router.delete("/:id", commentCtrl.deleteComment);

module.exports = router;
