import { Response } from 'express';
import { db } from '../db/connection.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const requesterController = {
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await db.queryOne('SELECT id, full_name, email, mobile, role, status FROM users WHERE id = $1', [userId]);
      const profile = await db.queryOne('SELECT * FROM requester_profiles WHERE user_id = $1', [userId]);
      const location = await db.queryOne("SELECT * FROM locations WHERE entity_id = $1 AND entity_type = 'user'", [userId]);
      const requestsCount = await db.queryOne('SELECT COUNT(*) as count FROM blood_requests WHERE requester_id = $1', [userId]);

      res.json({
        success: true,
        profile: {
          user,
          ...profile,
          location,
          requestsCount: Number(requestsCount?.count || 0),
        },
      });
    } catch (err: any) {
      console.error('Error fetching requester profile:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};
