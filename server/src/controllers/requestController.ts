import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { matchingService } from '../services/matchingService.js';
import { notificationService } from '../services/notificationService.js';

const createRequestSchema = z.object({
  patientName: z.string().min(2, 'Patient name required'),
  patientAge: z.number().min(0).max(120),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  bloodComponent: z.string().default('Whole Blood'),
  unitsRequired: z.number().min(1).max(20),
  hospitalName: z.string().min(2, 'Hospital name required'),
  hospitalAddress: z.string().min(5, 'Hospital address required'),
  latitude: z.number(),
  longitude: z.number(),
  requiredDate: z.string().min(1),
  requiredTime: z.string().min(1),
  priority: z.enum(['CRITICAL', 'URGENT', 'SCHEDULED']),
  additionalDetails: z.string().optional(),
});

export const requestController = {
  async createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = createRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0]?.message || 'Validation failed',
          errors: parsed.error.errors,
        });
        return;
      }

      const data = parsed.data;
      const requesterId = req.user!.userId;
      const requestId = uuidv4();

      // Requests start in PENDING_VERIFICATION to ensure clinical safety & prevent spam alerts
      const initialStatus = 'PENDING_VERIFICATION';

      await db.run(
        `INSERT INTO blood_requests (
          id, requester_id, patient_name, patient_age, blood_group, blood_component,
          units_required, hospital_name, hospital_address, latitude, longitude,
          required_date, required_time, priority, status, additional_details, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, datetime('now'), datetime('now')
        )`,
        [
          requestId,
          requesterId,
          data.patientName,
          data.patientAge,
          data.bloodGroup,
          data.bloodComponent,
          data.unitsRequired,
          data.hospitalName,
          data.hospitalAddress,
          data.latitude,
          data.longitude,
          data.requiredDate,
          data.requiredTime,
          data.priority,
          initialStatus,
          data.additionalDetails || '',
        ]
      );

      // Save hospital / request location entity
      await db.run(
        `INSERT INTO locations (id, entity_type, entity_id, state, district, taluka, locality, address, latitude, longitude, created_at)
         VALUES ($1, 'request', $2, 'Maharashtra', 'Pune', 'Haveli', $3, $4, $5, $6, datetime('now'))`,
        [uuidv4(), requestId, data.hospitalName, data.hospitalAddress, data.latitude, data.longitude]
      );

      // Notify administrators about new request awaiting verification
      const admins = await db.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: `New ${data.priority} Request Awaiting Verification`,
          message: `Blood request for ${data.patientName} (${data.bloodGroup}) at ${data.hospitalName} requires administrative verification before dispatch.`,
          type: 'ADMIN_ALERT',
          metadata: { requestId, priority: data.priority, hospitalName: data.hospitalName },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Emergency request registered successfully. It is currently under verification by our medical coordination desk.',
        requestId,
        status: initialStatus,
        verificationNotice: 'To prevent false alarms and ensure hospital coordination, our team reviews each request before dispatching notifications to potential voluntary donors.',
      });
    } catch (err: any) {
      console.error('Error creating blood request:', err);
      res.status(500).json({ success: false, message: 'Internal server error while creating request' });
    }
  },

  async getRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      let requests: any[];

      if (userRole === 'admin') {
        requests = await db.query(
          `SELECT br.*, u.full_name as requester_name, u.mobile as requester_mobile,
                  (SELECT COUNT(*) FROM donor_matches WHERE request_id = br.id) as matches_count,
                  (SELECT COUNT(*) FROM donor_matches WHERE request_id = br.id AND status = 'ACCEPTED') as accepted_count
           FROM blood_requests br
           JOIN users u ON br.requester_id = u.id
           ORDER BY 
             CASE br.status 
               WHEN 'PENDING_VERIFICATION' THEN 1 
               WHEN 'SEARCHING' THEN 2 
               WHEN 'DONOR_RESPONSES' THEN 3 
               ELSE 4 
             END,
             CASE br.priority 
               WHEN 'CRITICAL' THEN 1 
               WHEN 'URGENT' THEN 2 
               ELSE 3 
             END,
             br.created_at DESC`
        );
      } else {
        requests = await db.query(
          `SELECT br.*,
                  (SELECT COUNT(*) FROM donor_matches WHERE request_id = br.id) as matches_count,
                  (SELECT COUNT(*) FROM donor_matches WHERE request_id = br.id AND status = 'ACCEPTED') as accepted_count
           FROM blood_requests br
           WHERE br.requester_id = $1
           ORDER BY br.created_at DESC`,
          [userId]
        );
      }

      res.json({
        success: true,
        requests,
        count: requests.length,
      });
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await db.queryOne(
        `SELECT br.*, u.full_name as requester_name, u.mobile as requester_mobile
         FROM blood_requests br
         JOIN users u ON br.requester_id = u.id
         WHERE br.id = $1`,
        [id]
      );

      if (!request) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      // Fetch matches with privacy-preserving donor information (anonymizes exact coordinates)
      const matches = await db.query(
        `SELECT dm.id, dm.distance_km, dm.search_radius_km, dm.status, dm.match_score, dm.responded_at, dm.response_notes,
                u.full_name, u.mobile, dp.blood_group, dp.availability_status,
                l.locality, l.district
         FROM donor_matches dm
         JOIN donor_profiles dp ON dm.donor_id = dp.id
         JOIN users u ON dp.user_id = u.id
         LEFT JOIN locations l ON l.entity_id = dp.id AND l.entity_type = 'donor'
         WHERE dm.request_id = $1
         ORDER BY dm.status = 'ACCEPTED' DESC, dm.distance_km ASC`,
        [id]
      );

      res.json({
        success: true,
        request,
        matches,
      });
    } catch (err: any) {
      console.error('Error fetching request by id:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async cancelRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const request = await db.queryOne('SELECT * FROM blood_requests WHERE id = $1', [id]);
      if (!request) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      if (userRole !== 'admin' && request.requester_id !== userId) {
        res.status(403).json({ success: false, message: 'You are not authorized to cancel this request' });
        return;
      }

      await db.run(
        `UPDATE blood_requests SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = $1`,
        [id]
      );

      res.json({
        success: true,
        message: 'Request has been cancelled. Matching and pending donor notifications have been stopped.',
      });
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const results = await matchingService.findPotentialDonors(id);
      res.json({
        success: true,
        ...results,
      });
    } catch (err: any) {
      console.error('Error finding matches:', err);
      res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
  },
};
