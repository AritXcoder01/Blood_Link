import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { Notification, NotificationType } from '../types/index.js';
import { config } from '../config/index.js';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches an in-app notification with duplicate prevention and demo logging.
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const { userId, title, message, type, metadata = {} } = params;

    // Duplicate check: check if an identical notification was sent to this user in the last 10 minutes
    const existing = await db.queryOne(
      `SELECT id FROM notifications 
       WHERE user_id = $1 AND title = $2 
       AND created_at > datetime('now', '-10 minutes')`,
      [userId, title]
    );

    if (existing) {
      // Avoid spamming duplicate alerts
      return existing as Notification;
    }

    const notificationId = uuidv4();
    const metadataJson = JSON.stringify({
      ...metadata,
      demoMode: config.demoMode,
      smsSimulated: !config.isSmsConfigured,
      pushSimulated: !config.isFirebaseConfigured,
      timestamp: new Date().toISOString()
    });

    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata_json, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6, datetime('now'))`,
      [notificationId, userId, title, message, type, metadataJson]
    );

    if (!config.isSmsConfigured) {
      console.log(`📱 [DEMO NOTIFICATION] User ${userId.slice(0, 8)}... | Type: ${type} | ${title}`);
    }

    return {
      id: notificationId,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      metadata_json: metadataJson,
      created_at: new Date().toISOString()
    };
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const rows = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const row = await db.queryOne(
      `SELECT count(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0`,
      [userId]
    );
    return Number(row?.count || 0);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = $1`,
      [userId]
    );
  }
}

export const notificationService = new NotificationService();
