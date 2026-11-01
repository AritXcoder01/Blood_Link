import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { notificationService } from '../services/notificationService.js';

export const donorController = {
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const donor = await db.queryOne('SELECT * FROM donor_profiles WHERE user_id = $1', [userId]);

      if (!donor) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }

      const user = await db.queryOne('SELECT id, full_name, email, mobile, status, is_verified FROM users WHERE id = $1', [userId]);
      const location = await db.queryOne("SELECT * FROM locations WHERE entity_id = $1 AND entity_type = 'donor'", [donor.id]);
      const questionnaire = await db.queryOne('SELECT * FROM health_questionnaires WHERE donor_id = $1', [donor.id]);
      const donations = await db.query('SELECT * FROM donation_history WHERE donor_id = $1 ORDER BY donation_date DESC', [donor.id]);

      res.json({
        success: true,
        profile: {
          ...donor,
          user,
          location,
          questionnaire,
          donationsCount: donations.length,
          lastDonation: donations[0] || null,
        },
      });
    } catch (err: any) {
      console.error('Error fetching donor profile:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status } = req.body;

      if (!['AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'NOT_ACCEPTING'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Allowed values: AVAILABLE, TEMPORARILY_UNAVAILABLE, NOT_ACCEPTING',
        });
        return;
      }

      await db.run(
        `UPDATE donor_profiles 
         SET availability_status = $1, updated_at = datetime('now') 
         WHERE user_id = $2`,
        [status, userId]
      );

      res.json({
        success: true,
        message: `Availability updated to ${status}`,
        availabilityStatus: status,
      });
    } catch (err: any) {
      console.error('Error updating availability:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getAssignedRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const donor = await db.queryOne('SELECT id, blood_group FROM donor_profiles WHERE user_id = $1', [userId]);

      if (!donor) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }

      // Fetch matched requests from donor_matches
      const matches = await db.query(
        `SELECT dm.id as match_id, dm.status as response_status, dm.distance_km, dm.search_radius_km, 
                dm.match_score, dm.responded_at, dm.response_notes,
                br.id as request_id, br.patient_name, br.patient_age, br.blood_group, br.blood_component,
                br.units_required, br.hospital_name, br.hospital_address, br.required_date, br.required_time,
                br.priority, br.status as request_status, br.additional_details, br.created_at as request_created_at
         FROM donor_matches dm
         JOIN blood_requests br ON dm.request_id = br.id
         WHERE dm.donor_id = $1
           AND br.status NOT IN ('CANCELLED', 'REJECTED')
         ORDER BY dm.status = 'NOTIFIED' DESC, br.priority = 'CRITICAL' DESC, dm.distance_km ASC`,
        [donor.id]
      );

      res.json({
        success: true,
        requests: matches,
        count: matches.length,
      });
    } catch (err: any) {
      console.error('Error fetching donor requests:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async respondToRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { requestId } = req.params;
      const { response, notes } = req.body; // response: 'ACCEPTED' | 'DECLINED'

      if (!['ACCEPTED', 'DECLINED'].includes(response)) {
        res.status(400).json({
          success: false,
          message: "Response must be either 'ACCEPTED' (willing to assist) or 'DECLINED'",
        });
        return;
      }

      const donor = await db.queryOne('SELECT id, blood_group FROM donor_profiles WHERE user_id = $1', [userId]);
      const user = await db.queryOne('SELECT full_name, mobile FROM users WHERE id = $1', [userId]);

      if (!donor || !user) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }

      const match = await db.queryOne(
        `SELECT * FROM donor_matches WHERE request_id = $1 AND donor_id = $2`,
        [requestId, donor.id]
      );

      if (!match) {
        res.status(404).json({ success: false, message: 'Matching record for this emergency request not found' });
        return;
      }

      // Update match response
      await db.run(
        `UPDATE donor_matches 
         SET status = $1, response_notes = $2, responded_at = datetime('now')
         WHERE id = $3`,
        [response, notes || '', match.id]
      );

      const request = await db.queryOne('SELECT * FROM blood_requests WHERE id = $1', [requestId]);

      if (response === 'ACCEPTED' && request) {
        // Upgrade request status if in SEARCHING or PENDING
        if (['SEARCHING', 'VERIFIED'].includes(request.status)) {
          await db.run(
            `UPDATE blood_requests SET status = 'DONOR_RESPONSES', updated_at = datetime('now') WHERE id = $1`,
            [requestId]
          );
        }

        // Notify requester about the willing donor
        await notificationService.createNotification({
          userId: request.requester_id,
          title: 'Potential Donor Expressed Willingness!',
          message: `${user.full_name} (${donor.blood_group}) expressed willingness to assist with your request at ${request.hospital_name}.`,
          type: 'DONOR_RESPONSE',
          metadata: {
            requestId,
            donorName: user.full_name,
            bloodGroup: donor.blood_group,
            distanceKm: match.distance_km,
            notes: notes || '',
          },
        });
      }

      res.json({
        success: true,
        message: response === 'ACCEPTED'
          ? 'Thank you! Your willingness to donate has been communicated to the hospital coordinator and patient attendant.'
          : 'Request declined. Thank you for keeping your availability accurate.',
        disclaimer: 'Expressing willingness indicates your intent to be contacted. Final medical eligibility is determined by the hospital blood bank team upon pre-donation screening.',
      });
    } catch (err: any) {
      console.error('Error responding to request:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getDonationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const donor = await db.queryOne('SELECT id FROM donor_profiles WHERE user_id = $1', [userId]);

      if (!donor) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }

      const history = await db.query(
        `SELECT * FROM donation_history WHERE donor_id = $1 ORDER BY donation_date DESC`,
        [donor.id]
      );

      res.json({ success: true, history });
    } catch (err: any) {
      console.error('Error fetching donation history:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async addDonationRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { donationDate, unitsDonated, bloodComponent, hospitalName, notes } = req.body;

      const donor = await db.queryOne('SELECT id FROM donor_profiles WHERE user_id = $1', [userId]);
      if (!donor) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }

      const recordId = uuidv4();
      await db.run(
        `INSERT INTO donation_history (id, donor_id, donation_date, units_donated, blood_component, hospital_name, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'))`,
        [recordId, donor.id, donationDate, unitsDonated || 1, bloodComponent || 'Whole Blood', hospitalName, notes || '']
      );

      // Update last donation date on donor profile
      await db.run(
        `UPDATE donor_profiles SET last_donation_date = $1, updated_at = datetime('now') WHERE id = $2`,
        [donationDate, donor.id]
      );

      res.status(201).json({ success: true, message: 'Donation record saved successfully!' });
    } catch (err: any) {
      console.error('Error adding donation record:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};
