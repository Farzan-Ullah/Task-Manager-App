const express = require("express");
const router = express.Router();
const issueCtrl = require("../../controllers/v1/issueController");
const commentCtrl = require("../../controllers/v1/commentController");
const { verifyToken } = require("../../middlewares/TokenVerification");
const upload = require("../../middlewares/upload");

router.use(verifyToken);

router.post("/", issueCtrl.createIssue);
router.get("/", issueCtrl.getIssues);

// Bulk operations
router.post("/bulk/update", issueCtrl.bulkUpdateIssues);
router.post("/bulk/delete", issueCtrl.bulkDeleteIssues);

router.get("/:id", issueCtrl.getIssueById);
router.patch("/:id", issueCtrl.updateIssue);
router.patch("/:id/move", issueCtrl.moveIssue);
router.delete("/:id", issueCtrl.deleteIssue);
router.post("/:id/attachments", upload.single("file"), issueCtrl.uploadAttachment);

// Pull Requests (PRs) linked to tasks
router.post("/:id/pull-requests", issueCtrl.raisePullRequest);
router.patch("/:id/pull-requests/:prId", issueCtrl.updatePullRequest);
router.delete("/:id/pull-requests/:prId", issueCtrl.deletePullRequest);

// Nested comments route
router.post("/:issueId/comments", commentCtrl.createComment);

module.exports = router;
