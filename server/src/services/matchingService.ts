import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { BloodGroup, BloodComponent, RequestStatus } from '../types/index.js';
import { notificationService } from './notificationService.js';

// Transfusion compatibility reference for red blood cells / whole blood
const COMPATIBLE_DONOR_MAP: Record<BloodGroup, BloodGroup[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'] // Universal Red Cell Donor
};

// Plasma compatibility (reverse of red blood cells)
const PLASMA_COMPATIBLE_DONOR_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'O-': ['O-', 'A-', 'B-', 'AB-'],
  'A+': ['A+', 'AB+'],
  'A-': ['A-', 'AB-'],
  'B+': ['B+', 'AB+'],
  'B-': ['B-', 'AB-'],
  'AB+': ['AB+'], // Universal Plasma Donor is AB
  'AB-': ['AB-']
};

/**
 * Calculates geographical distance in kilometers between two coordinates using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

export interface MatchCandidate {
  donorProfileId: string;
  userId: string;
  fullName: string;
  bloodGroup: BloodGroup;
  mobile: string;
  locality: string;
  district: string;
  distanceKm: number;
  searchRadiusKm: number;
  matchScore: number;
  lastDonationDate?: string;
  isExactBloodGroup: boolean;
  medicalDisclaimer: string;
}

export class MatchingService {
  /**
   * Identifies potential voluntary donors for an emergency request within progressive tiers: 5km, 10km, 25km.
   *
   * IMPORTANT REGULATORY SAFETY DISCLAIMER:
   * The output consists strictly of 'potential voluntary donors'.
   * The system does NOT determine clinical eligibility or transfusion safety.
   * Licensed blood centre personnel must execute all medical screenings, cross-matching, and pre-donation interviews.
   */
  async findPotentialDonors(requestId: string): Promise<{
    candidates: MatchCandidate[];
    tiersSummary: { tier5km: number; tier10km: number; tier25km: number };
    requestDetails: any;
  }> {
    // 1. Fetch request details
    const request = await db.queryOne(
      `SELECT br.*, u.full_name as requester_name, u.mobile as requester_mobile
       FROM blood_requests br
       JOIN users u ON br.requester_id = u.id
       WHERE br.id = $1`,
      [requestId]
    );

    if (!request) {
      throw new Error(`Blood request with id ${requestId} not found`);
    }

    // Requests cannot be matched if cancelled, fulfilled, or rejected
    if (['CANCELLED', 'FULFILLED', 'REJECTED'].includes(request.status)) {
      return {
        candidates: [],
        tiersSummary: { tier5km: 0, tier10km: 0, tier25km: 0 },
        requestDetails: request
      };
    }

    const patientBloodGroup = request.blood_group as BloodGroup;
    const bloodComponent = request.blood_component as BloodComponent;
    const reqLat = Number(request.latitude);
    const reqLng = Number(request.longitude);

    // Determine compatible donor blood groups
    const isPlasma = bloodComponent.includes('Plasma');
    const compatibleGroups = isPlasma
      ? PLASMA_COMPATIBLE_DONOR_MAP[patientBloodGroup] || [patientBloodGroup]
      : COMPATIBLE_DONOR_MAP[patientBloodGroup] || [patientBloodGroup];

    // 2. Fetch all registered, active, available donors with their locations
    const donors = await db.query(
      `SELECT dp.id as donor_profile_id, dp.blood_group, dp.availability_status, dp.last_donation_date,
              u.id as user_id, u.full_name, u.mobile, u.status as user_status, u.is_verified,
              l.latitude, l.longitude, l.locality, l.district, l.taluka, l.state
       FROM donor_profiles dp
       JOIN users u ON dp.user_id = u.id
       JOIN locations l ON l.entity_id = dp.id AND l.entity_type = 'donor'
       WHERE u.role = 'donor'
         AND u.status = 'active'
         AND dp.availability_status = 'AVAILABLE'`
    );

    // 3. Fetch existing matches for this request to prevent duplicates
    const existingMatches = await db.query(
      `SELECT donor_id, status FROM donor_matches WHERE request_id = $1`,
      [requestId]
    );
    const existingDonorIds = new Set(existingMatches.map((m: any) => m.donor_id));

    const allCandidates: MatchCandidate[] = [];
    let tier5km = 0;
    let tier10km = 0;
    let tier25km = 0;

    for (const donor of donors) {
      const donorBloodGroup = donor.blood_group as BloodGroup;

      // Compatibility filter
      if (!compatibleGroups.includes(donorBloodGroup)) {
        continue;
      }

      const donorLat = Number(donor.latitude);
      const donorLng = Number(donor.longitude);
      if (isNaN(donorLat) || isNaN(donorLng)) continue;

      const distanceKm = calculateHaversineDistanceKm(reqLat, reqLng, donorLat, donorLng);

      // Maximum search perimeter is 25 km
      if (distanceKm > 25.0) continue;

      let searchRadiusKm = 25;
      if (distanceKm <= 5.0) {
        searchRadiusKm = 5;
        tier5km++;
      } else if (distanceKm <= 10.0) {
        searchRadiusKm = 10;
        tier10km++;
      } else {
        tier25km++;
      }

      // Compute Ranking Match Score (0 - 100)
      // Proximity: up to 60 pts (5km => ~60, 25km => ~20)
      const distanceScore = Math.max(0, 60 - (distanceKm / 25) * 40);

      // Exact Blood Group vs Compatible: 30 pts exact, 15 pts compatible
      const isExactBloodGroup = donorBloodGroup === patientBloodGroup;
      const bloodScore = isExactBloodGroup ? 30 : 15;

      // Recency / Donation history freshness: 10 pts
      let recencyScore = 10;
      if (donor.last_donation_date) {
        const daysSince = (Date.now() - new Date(donor.last_donation_date).getTime()) / (1000 * 3600 * 24);
        if (daysSince < 90) {
          recencyScore = 2; // Under 90 days recommended rest interval
        }
      }

      const matchScore = Math.round((distanceScore + bloodScore + recencyScore) * 10) / 10;

      allCandidates.push({
        donorProfileId: donor.donor_profile_id,
        userId: donor.user_id,
        fullName: donor.full_name,
        bloodGroup: donorBloodGroup,
        mobile: donor.mobile,
        locality: donor.locality,
        district: donor.district,
        distanceKm,
        searchRadiusKm,
        matchScore,
        lastDonationDate: donor.last_donation_date,
        isExactBloodGroup,
        medicalDisclaimer: 'Identified as a potential voluntary donor. Final eligibility and cross-matching must be performed by certified blood centre staff.'
      });
    }

    // Rank candidates: highest score first, then closest distance
    allCandidates.sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);

    // 4. Save new matches to database and notify donors if request is VERIFIED or SEARCHING
    if (['VERIFIED', 'SEARCHING', 'DONOR_RESPONSES'].includes(request.status)) {
      for (const candidate of allCandidates) {
        if (!existingDonorIds.has(candidate.donorProfileId)) {
          const matchId = uuidv4();
          await db.run(
            `INSERT INTO donor_matches (id, request_id, donor_id, distance_km, search_radius_km, status, match_score, created_at)
             VALUES ($1, $2, $3, $4, $5, 'NOTIFIED', $6, datetime('now'))`,
            [matchId, requestId, candidate.donorProfileId, candidate.distanceKm, candidate.searchRadiusKm, candidate.matchScore]
          );

          // In-app notification for the donor (sanitized preview: does not leak full patient details)
          await notificationService.createNotification({
            userId: candidate.userId,
            title: `Emergency ${request.priority} Blood Request (${candidate.distanceKm} km away)`,
            message: `A patient at ${request.hospital_name} needs ${request.blood_group} ${request.blood_component}. Check your dashboard to view details and express willingness to donate.`,
            type: 'EMERGENCY_REQUEST',
            metadata: {
              requestId,
              hospitalName: request.hospital_name,
              bloodGroup: request.blood_group,
              priority: request.priority,
              distanceKm: candidate.distanceKm
            }
          });
        }
      }

      // Update request status to SEARCHING if it was VERIFIED
      if (request.status === 'VERIFIED') {
        await db.run(
          `UPDATE blood_requests SET status = 'SEARCHING', updated_at = datetime('now') WHERE id = $1`,
          [requestId]
        );
      }
    }

    return {
      candidates: allCandidates,
      tiersSummary: { tier5km, tier10km, tier25km },
      requestDetails: request
    };
  }
}

export const matchingService = new MatchingService();
