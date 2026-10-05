const notificationService = require("../../services/notificationService");

/**
 * Get user's notifications and unread count
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { limit = 30 } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, Number(limit));
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark single notification as read
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await notificationService.markAsRead(id, userId);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
