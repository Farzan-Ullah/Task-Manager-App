const { Notification, User } = require("../models");
const socketService = require("./socketService");

/**
 * In-app notification service
 */
class NotificationService {
  /**
   * Create and dispatch a single notification
   * @param {Object} params
   * @param {ObjectId} params.userId - Recipient
   * @param {string} params.type - e.g. "ASSIGNMENT", "MENTION", "COMMENT", "STATUS_CHANGE", "SPRINT_START"
   * @param {string} params.title
   * @param {string} params.message
   * @param {Object} [params.payload]
   * @returns {Promise<Notification>}
   */
  async createNotification({ userId, type, title, message, payload = {} }) {
    try {
      if (!userId || !type || !title) return null;

      // Don't notify self if sender is recipient
      if (payload.senderId && payload.senderId.toString() === userId.toString()) {
        return null;
      }

      const notification = new Notification({
        userId,
        type,
        title,
        message,
        payload,
      });

      await notification.save();

      const populated = await Notification.findById(notification._id)
        .populate("payload.senderId", "name email avatar")
        .populate("payload.issueId", "key title")
        .lean();

      // Emit real-time notification to user's personal socket room
      socketService.emitToUser(userId, "notification.created", populated);

      return populated;
    } catch (error) {
      console.error("Failed to create notification:", error.message);
      return null;
    }
  }

  /**
   * Notify multiple users (e.g. project members, watchers, mentioned users)
   * @param {ObjectId[]} userIds
   * @param {Object} notificationData
   */
  async notifyUsers(userIds, notificationData) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const uniqueIds = [...new Set(userIds.map((id) => id.toString()))];
    const results = [];

    for (const uid of uniqueIds) {
      const res = await this.createNotification({
        userId: uid,
        ...notificationData,
      });
      if (res) results.push(res);
    }

    return results;
  }

  /**
   * Notify all project members with a specific role
   * @param {Object} project
   * @param {string} role - "Project Manager", "Member", etc.
   * @param {Object} notificationData
   */
  async notifyRole(project, role, notificationData) {
    if (!project || !project.members) return [];
    const targetUserIds = project.members
      .filter((m) => m.role === role)
      .map((m) => m.userId);

    return this.notifyUsers(targetUserIds, notificationData);
  }

  /**
   * Get unread notifications for a user
   * @param {ObjectId} userId
   * @param {number} [limit=20]
   */
  async getUserNotifications(userId, limit = 20) {
    return Notification.find({ userId })
      .populate("payload.senderId", "name email avatar")
      .populate("payload.issueId", "key title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get unread notification count
   * @param {ObjectId} userId
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, readAt: null });
  }

  /**
   * Mark a notification as read
   * @param {ObjectId} notificationId
   * @param {ObjectId} userId
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   * @param {ObjectId} userId
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
  }
}

module.exports = new NotificationService();
