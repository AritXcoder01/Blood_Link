import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { matchingService } from '../services/matchingService.js';
import { notificationService } from '../services/notificationService.js';

export const adminController = {
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const donorsCount = await db.queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'donor'");
      const requestersCount = await db.queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'requester'");
      const totalRequests = await db.queryOne('SELECT COUNT(*) as count FROM blood_requests');
      const activeRequests = await db.queryOne(
        "SELECT COUNT(*) as count FROM blood_requests WHERE status IN ('VERIFIED', 'SEARCHING', 'DONOR_RESPONSES', 'COORDINATING')"
      );
      const fulfilledRequests = await db.queryOne("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'FULFILLED'");
      const pendingVerification = await db.queryOne("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'PENDING_VERIFICATION'");

      // Donors by Blood Group
      const donorsByBloodGroup = await db.query(
        `SELECT blood_group, COUNT(*) as count 
         FROM donor_profiles 
         GROUP BY blood_group 
         ORDER BY blood_group`
      );

      // Requests by Priority
      const requestsByPriority = await db.query(
        `SELECT priority, COUNT(*) as count 
         FROM blood_requests 
         GROUP BY priority`
      );

      // Requests by Status
      const requestsByStatus = await db.query(
        `SELECT status, COUNT(*) as count 
         FROM blood_requests 
         GROUP BY status`
      );

      // Recent 5 Requests
      const recentRequests = await db.query(
        `SELECT br.*, u.full_name as requester_name 
         FROM blood_requests br 
         JOIN users u ON br.requester_id = u.id 
         ORDER BY br.created_at DESC 
         LIMIT 5`
      );

      res.json({
        success: true,
        stats: {
          totalDonors: Number(donorsCount?.count || 0),
          totalRequesters: Number(requestersCount?.count || 0),
          totalRequests: Number(totalRequests?.count || 0),
          activeRequests: Number(activeRequests?.count || 0),
          fulfilledRequests: Number(fulfilledRequests?.count || 0),
          pendingVerification: Number(pendingVerification?.count || 0),
          donorsByBloodGroup,
          requestsByPriority,
          requestsByStatus,
        },
        recentRequests,
      });
    } catch (err: any) {
      console.error('Error in admin dashboard:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { role, status } = req.query;

      let sql = `
        SELECT u.id, u.full_name, u.email, u.mobile, u.role, u.status, u.is_verified, u.created_at,
               dp.blood_group, dp.availability_status, dp.last_donation_date,
               rp.requester_type,
               l.locality, l.district
        FROM users u
        LEFT JOIN donor_profiles dp ON dp.user_id = u.id
        LEFT JOIN requester_profiles rp ON rp.user_id = u.id
        LEFT JOIN locations l ON (l.entity_id = u.id OR l.entity_id = dp.id)
        WHERE 1=1
      `;
      const params: any[] = [];

      if (role) {
        params.push(role);
        sql += ` AND u.role = $${params.length}`;
      }

      if (status) {
        params.push(status);
        sql += ` AND u.status = $${params.length}`;
      }

      sql += ' ORDER BY u.created_at DESC';

      const users = await db.query(sql, params);

      res.json({
        success: true,
        users,
        count: users.length,
      });
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'active' | 'suspended'

      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be active or suspended' });
        return;
      }

      const adminId = req.user!.userId;

      await db.run(
        `UPDATE users SET status = $1, updated_at = datetime('now') WHERE id = $2`,
        [status, id]
      );

      // Audit Log
      await db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, 'user', $4, $5, datetime('now'))`,
        [uuidv4(), adminId, `UPDATE_USER_STATUS_${status.toUpperCase()}`, id, `Admin updated user status to ${status}`]
      );

      res.json({
        success: true,
        message: `User status successfully updated to ${status}`,
      });
    } catch (err: any) {
      console.error('Error updating user status:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async verifyRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      const request = await db.queryOne('SELECT * FROM blood_requests WHERE id = $1', [id]);
      if (!request) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      // Update status to VERIFIED
      await db.run(
        `UPDATE blood_requests 
         SET status = 'VERIFIED', verified_by = $1, verified_at = datetime('now'), updated_at = datetime('now') 
         WHERE id = $2`,
        [adminId, id]
      );

      // Audit Log
      await db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'VERIFY_REQUEST', 'blood_request', $3, 'Blood request clinically verified and approved for matching', datetime('now'))`,
        [uuidv4(), adminId, id]
      );

      // Trigger automatic matching engine search
      const matchResult = await matchingService.findPotentialDonors(id);

      // Notify requester that request has been verified & is now searching
      await notificationService.createNotification({
        userId: request.requester_id,
        title: 'Emergency Request Verified',
        message: `Your emergency request for ${request.patient_name} (${request.blood_group}) at ${request.hospital_name} has been verified. Matching donors are being notified.`,
        type: 'STATUS_UPDATE',
        metadata: { requestId: id, matchedDonorsCount: matchResult.candidates.length },
      });

      res.json({
        success: true,
        message: `Request #${id.slice(0, 8)} verified successfully. Core matching engine dispatched notifications to ${matchResult.candidates.length} potential voluntary donors nearby.`,
        matchesFound: matchResult.candidates.length,
        tiersSummary: matchResult.tiersSummary,
      });
    } catch (err: any) {
      console.error('Error verifying request:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async rejectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      const request = await db.queryOne('SELECT * FROM blood_requests WHERE id = $1', [id]);
      if (!request) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      await db.run(
        `UPDATE blood_requests 
         SET status = 'REJECTED', rejection_reason = $1, updated_at = datetime('now') 
         WHERE id = $2`,
        [reason || 'Request details could not be validated with hospital blood desk.', id]
      );

      // Audit Log
      await db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'REJECT_REQUEST', 'blood_request', $3, $4, datetime('now'))`,
        [uuidv4(), adminId, id, `Rejected reason: ${reason || 'Unverified'}`]
      );

      // Notify requester
      await notificationService.createNotification({
        userId: request.requester_id,
        title: 'Blood Request Rejected',
        message: `Your blood request for ${request.patient_name} could not be verified: ${reason || 'Incomplete hospital verification details.'}`,
        type: 'STATUS_UPDATE',
        metadata: { requestId: id, reason },
      });

      res.json({
        success: true,
        message: 'Request has been rejected and archived.',
      });
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getAuditLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const logs = await db.query(
        `SELECT aal.*, u.full_name as admin_name, u.email as admin_email
         FROM admin_audit_logs aal
         JOIN users u ON aal.admin_id = u.id
         ORDER BY aal.created_at DESC
         LIMIT 100`
      );
      res.json({ success: true, logs });
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};
