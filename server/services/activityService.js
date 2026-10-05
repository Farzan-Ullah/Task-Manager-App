const { Activity } = require("../models");
const socketService = require("./socketService");

/**
 * Audit trail and activity logging service
 */
class ActivityService {
  /**
   * Log an activity event
   * @param {Object} params
   * @param {ObjectId} params.projectId
   * @param {ObjectId} [params.issueId]
   * @param {ObjectId} params.actorId
   * @param {string} params.action - e.g. "ISSUE_CREATED", "STATUS_CHANGED", "ISSUE_MOVED", "ASSIGNED"
   * @param {Object} [params.diff] - Before/after change data
   * @returns {Promise<Activity>}
   */
  async logActivity({ projectId, issueId = null, actorId, action, diff = {} }) {
    try {
      if (!projectId || !actorId || !action) {
        console.warn("Activity logging skipped: missing required parameters");
        return null;
      }

      const activity = new Activity({
        projectId,
        issueId,
        actorId,
        action,
        diff,
      });

      await activity.save();

      // Populate actor for real-time broadcast
      const populatedActivity = await Activity.findById(activity._id).populate(
        "actorId",
        "name email avatar"
      );

      // Broadcast real-time activity to project and issue rooms
      socketService.emitToProject(projectId, "activity.created", populatedActivity);
      if (issueId) {
        socketService.emitToIssue(issueId, "activity.created", populatedActivity);
      }

      return populatedActivity;
    } catch (error) {
      console.error("Failed to log activity:", error.message);
      // Non-blocking: fail gracefully without disrupting main mutation
      return null;
    }
  }

  /**
   * Get activity timeline for an issue
   * @param {ObjectId} issueId
   * @param {number} [limit=50]
   */
  async getIssueActivities(issueId, limit = 50) {
    return Activity.find({ issueId })
      .populate("actorId", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get activity timeline for a project
   * @param {ObjectId} projectId
   * @param {number} [limit=50]
   */
  async getProjectActivities(projectId, limit = 50) {
    return Activity.find({ projectId })
      .populate("actorId", "name email avatar")
      .populate("issueId", "key title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new ActivityService();
