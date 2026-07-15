import prisma from '../config/prisma.js';

// Get all notifications for the logged-in user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Fetch latest 50
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await prisma.notification.updateMany({
      where: { id: parseInt(id), userId },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all notifications as read for the user
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to create a notification internally
export const createNotification = async ({ title, message, type = 'INFO', userId, relatedEntity = null, entityId = null }) => {
  try {
    return await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId,
        relatedEntity,
        entityId
      }
    });
  } catch (error) {
    console.error('Failed to create notification internally:', error);
  }
};
