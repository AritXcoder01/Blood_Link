import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { notificationService } from '../services/notificationService.js';

export const notificationController = {
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notifications = await notificationService.getUserNotifications(userId);
      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        notifications,
        unreadCount,
      });
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await notificationService.markAsRead(id, userId);

      res.json({ success: true, message: 'Notification marked as read' });
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      await notificationService.markAllAsRead(userId);

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};
