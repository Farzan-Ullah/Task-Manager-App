const { Comment, Issue, User } = require("../../models");
const socketService = require("../../services/socketService");
const notificationService = require("../../services/notificationService");
const activityService = require("../../services/activityService");

/**
 * Add comment to an issue
 */
const createComment = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { body, mentions = [] } = req.body;
    const userId = req.user.userId;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Comment body is required" });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    // Auto-detect mentions if not explicitly passed: @username
    const detectedUsernames = (body.match(/@([a-zA-Z0-9._-]+)/g) || []).map((m) =>
      m.substring(1).toLowerCase()
    );

    let mentionedUserIds = [...mentions];
    if (detectedUsernames.length > 0) {
      const users = await User.find({
        $or: [
          { name: { $in: detectedUsernames.map((n) => new RegExp(`^${n}$`, "i")) } },
          { email: { $in: detectedUsernames.map((n) => new RegExp(`^${n}@`, "i")) } },
        ],
      }).select("_id");
      mentionedUserIds = [
        ...new Set([...mentionedUserIds, ...users.map((u) => u._id.toString())]),
      ];
    }

    const comment = new Comment({
      issueId,
      authorId: userId,
      body: body.trim(),
      mentions: mentionedUserIds,
    });

    await comment.save();

    const populated = await Comment.findById(comment._id).populate(
      "authorId",
      "name email avatar"
    );

    // Add author to watchers if not already
    if (!issue.watchers.includes(userId)) {
      issue.watchers.push(userId);
      await issue.save();
    }

    // Notify mentioned users
    for (const mentionedId of mentionedUserIds) {
      if (mentionedId.toString() !== userId.toString()) {
        await notificationService.createNotification({
          userId: mentionedId,
          type: "MENTION",
          title: `Mentioned in ${issue.key}`,
          message: `${req.user.email} mentioned you in a comment on ${issue.key}`,
          payload: {
            projectId: issue.projectId,
            issueId: issue._id,
            issueKey: issue.key,
            commentId: comment._id,
            senderId: userId,
          },
        });
      }
    }

    // Notify issue assignee & reporter if different from author
    const recipients = [issue.assigneeId, issue.reporterId].filter(
      (id) => id && id.toString() !== userId.toString() && !mentionedUserIds.includes(id.toString())
    );

    for (const rId of recipients) {
      await notificationService.createNotification({
        userId: rId,
        type: "COMMENT",
        title: `New Comment on ${issue.key}`,
        message: `${req.user.email} commented on ${issue.key}`,
        payload: {
          projectId: issue.projectId,
          issueId: issue._id,
          issueKey: issue.key,
          commentId: comment._id,
          senderId: userId,
        },
      });
    }

    // Log Activity
    await activityService.logActivity({
      projectId: issue.projectId,
      issueId: issue._id,
      actorId: userId,
      action: "COMMENT_ADDED",
      diff: { commentId: comment._id },
    });

    // Broadcast real-time comment event
    socketService.emitToIssue(issueId, "comment.created", populated);
    socketService.emitToProject(issue.projectId, "comment.created", populated);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update comment
 */
const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const userId = req.user.userId;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Comment body is required" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (comment.authorId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own comments" });
    }

    comment.body = body.trim();
    await comment.save();

    const populated = await Comment.findById(id).populate("authorId", "name email avatar");

    socketService.emitToIssue(comment.issueId, "comment.updated", populated);

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete comment
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // Allow author or Workspace Admin to delete
    if (comment.authorId.toString() !== userId.toString() && req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "You can only delete your own comments" });
    }

    const issueId = comment.issueId;
    await Comment.findByIdAndDelete(id);

    socketService.emitToIssue(issueId, "comment.deleted", { commentId: id });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
};
