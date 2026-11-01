import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection.js';
import { initDatabase } from './init.js';

export async function seedDatabase(): Promise<void> {
  // Strict Production Guard: Prevent accidental production seeding
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Database seed execution is strictly prohibited in production mode!');
  }

  console.log('🌱 [SEED] Starting database seeding with realistic demonstration data...');
  await initDatabase();

  // Check if already seeded
  const existingUsers = await db.query('SELECT count(*) as count FROM users');
  const userCount = Number(existingUsers[0]?.count || 0);

  if (userCount > 0) {
    console.log(`ℹ️ [SEED] Database already contains ${userCount} users. Cleaning old demo data for fresh seed...`);
    await db.exec(`
      DELETE FROM notifications;
      DELETE FROM donor_matches;
      DELETE FROM blood_requests;
      DELETE FROM donation_history;
      DELETE FROM health_questionnaires;
      DELETE FROM locations;
      DELETE FROM hospitals;
      DELETE FROM donor_profiles;
      DELETE FROM requester_profiles;
      DELETE FROM users;
    `);
  }

  const saltRounds = 10;
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
  const donorPassword = process.env.DONOR_DEFAULT_PASSWORD || 'Donor@123';
  const requesterPassword = process.env.REQUESTER_DEFAULT_PASSWORD || 'Requester@123';
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
  const donorPasswordHash = await bcrypt.hash(donorPassword, saltRounds);
  const requesterPasswordHash = await bcrypt.hash(requesterPassword, saltRounds);

  // 1. Admin
  const adminId = uuidv4();
  await db.run(
    `INSERT INTO users (id, full_name, email, password_hash, mobile, role, status, is_verified, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now'))`,
    [adminId, 'Dr. Sarah Mitchell (Chief Admin)', 'admin@bloodlink.org', adminPasswordHash, '+91-9876543210', 'admin', 'active', true]
  );

  // 2. Hospitals (Pune Healthcare Hub demonstration coordinates)
  // Base center: Shivajinagar / Deccan Gymkhana (Lat: 18.5204, Lng: 73.8567)
  const hospitals = [
    {
      id: uuidv4(),
      name: 'Ruby Hall Clinic & Research Center',
      address: '40 Sassoon Road, Sangamvadi, Pune',
      district: 'Pune',
      taluka: 'Haveli',
      state: 'Maharashtra',
      latitude: 18.5312,
      longitude: 73.8741,
      contact_number: '+91-20-66455100',
      blood_bank_available: true,
      email: 'bloodbank@rubyhall.com'
    },
    {
      id: uuidv4(),
      name: 'Sahyadri Super Speciality Hospital',
      address: 'Plot No. 30 C, Erandwane, Karve Road, Pune',
      district: 'Pune',
      taluka: 'Haveli',
      state: 'Maharashtra',
      latitude: 18.5063,
      longitude: 73.8329,
      contact_number: '+91-20-67215000',
      blood_bank_available: true,
      email: 'bloodbank@sahyadrihospitals.com'
    },
    {
      id: uuidv4(),
      name: 'Jehangir Hospital Blood Centre',
      address: '32 Sassoon Road, Opp Pune Railway Station',
      district: 'Pune',
      taluka: 'Haveli',
      state: 'Maharashtra',
      latitude: 18.5298,
      longitude: 73.8712,
      contact_number: '+91-20-66811000',
      blood_bank_available: true,
      email: 'bloodbank@jehangirhospital.com'
    },
    {
      id: uuidv4(),
      name: 'KEM Hospital & Research Centre',
      address: '489 Rasta Peth, Sardar Moodliar Road, Pune',
      district: 'Pune',
      taluka: 'Haveli',
      state: 'Maharashtra',
      latitude: 18.5190,
      longitude: 73.8670,
      contact_number: '+91-20-66037300',
      blood_bank_available: true,
      email: 'kem_bloodcentre@kemhospitalpune.org'
    }
  ];

  for (const h of hospitals) {
    await db.run(
      `INSERT INTO hospitals (id, name, address, district, taluka, state, latitude, longitude, contact_number, blood_bank_available, email, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, datetime('now'))`,
      [h.id, h.name, h.address, h.district, h.taluka, h.state, h.latitude, h.longitude, h.contact_number, h.blood_bank_available, h.email]
    );
  }

  // 3. Requesters (3 Demo accounts)
  const requestersData = [
    {
      name: 'Priya Sharma (Patient Attendant)',
      email: 'priya.sharma@example.com',
      mobile: '+91-9123456781',
      requester_type: 'Attendant',
      locality: 'Kothrud',
      lat: 18.5074,
      lng: 73.8077
    },
    {
      name: 'Amitabh Joshi (Patient)',
      email: 'amitabh.joshi@example.com',
      mobile: '+91-9123456782',
      requester_type: 'Patient',
      locality: 'Viman Nagar',
      lat: 18.5679,
      lng: 73.9143
    },
    {
      name: 'Sneha Patel (Family Caregiver)',
      email: 'sneha.patel@example.com',
      mobile: '+91-9123456783',
      requester_type: 'Attendant',
      locality: 'Aundh',
      lat: 18.5580,
      lng: 73.8075
    }
  ];

  const requesterIds: string[] = [];

  for (const req of requestersData) {
    const userId = uuidv4();
    requesterIds.push(userId);
    await db.run(
      `INSERT INTO users (id, full_name, email, password_hash, mobile, role, status, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, 'requester', 'active', 1, datetime('now'))`,
      [userId, req.name, req.email, requesterPasswordHash, req.mobile]
    );

    const profileId = uuidv4();
    await db.run(
      `INSERT INTO requester_profiles (id, user_id, requester_type, created_at)
       VALUES ($1, $2, $3, datetime('now'))`,
      [profileId, userId, req.requester_type]
    );

    await db.run(
      `INSERT INTO locations (id, entity_type, entity_id, state, district, taluka, locality, latitude, longitude, created_at)
       VALUES ($1, 'user', $2, 'Maharashtra', 'Pune', 'Haveli', $3, $4, $5, datetime('now'))`,
      [uuidv4(), userId, req.locality, req.lat, req.lng]
    );
  }

  // 4. Donors (9 Realistic Voluntary Donors across all 8 blood groups & various distances)
  const donorsData = [
    {
      name: 'Rahul Deshmukh',
      email: 'rahul.o_pos@bloodlink.org',
      mobile: '+91-9822011111',
      dob: '1995-04-12',
      blood_group: 'O+',
      availability: 'AVAILABLE',
      locality: 'Shivajinagar',
      lat: 18.5308,
      lng: 73.8475, // ~2.5 km from Ruby Hall
      last_donation: '2026-06-15'
    },
    {
      name: 'Ananya Deshpande',
      email: 'ananya.a_pos@bloodlink.org',
      mobile: '+91-9822022222',
      dob: '1998-08-23',
      blood_group: 'A+',
      availability: 'AVAILABLE',
      locality: 'Koregaon Park',
      lat: 18.5362,
      lng: 73.8958, // ~2.8 km from Ruby Hall
      last_donation: '2026-05-10'
    },
    {
      name: 'Vikram Malhotra',
      email: 'vikram.b_pos@bloodlink.org',
      mobile: '+91-9822033333',
      dob: '1992-11-05',
      blood_group: 'B+',
      availability: 'AVAILABLE',
      locality: 'Kothrud',
      lat: 18.5074,
      lng: 73.8077, // ~7.5 km from Ruby Hall (10km tier)
      last_donation: '2026-07-01'
    },
    {
      name: 'Neha Kulkarni',
      email: 'neha.ab_pos@bloodlink.org',
      mobile: '+91-9822044444',
      dob: '2000-02-17',
      blood_group: 'AB+',
      availability: 'AVAILABLE',
      locality: 'Camp',
      lat: 18.5144,
      lng: 73.8795, // ~2.1 km from Ruby Hall (5km tier)
      last_donation: '2026-08-12'
    },
    {
      name: 'Rohan Shinde',
      email: 'rohan.o_neg@bloodlink.org',
      mobile: '+91-9822055555',
      dob: '1994-09-30',
      blood_group: 'O-', // Universal red cell donor
      availability: 'AVAILABLE',
      locality: 'Deccan Gymkhana',
      lat: 18.5173,
      lng: 73.8415, // ~3.8 km from Ruby Hall (5km tier)
      last_donation: '2026-04-18'
    },
    {
      name: 'Dr. Kavita Verma',
      email: 'kavita.a_neg@bloodlink.org',
      mobile: '+91-9822066666',
      dob: '1989-12-14',
      blood_group: 'A-',
      availability: 'AVAILABLE',
      locality: 'Baner',
      lat: 18.5590,
      lng: 73.7868, // ~10.5 km from Ruby Hall (25km tier)
      last_donation: '2026-03-22'
    },
    {
      name: 'Suresh Patil',
      email: 'suresh.b_neg@bloodlink.org',
      mobile: '+91-9822077777',
      dob: '1996-01-25',
      blood_group: 'B-',
      availability: 'TEMPORARILY_UNAVAILABLE',
      locality: 'Hadapsar',
      lat: 18.5089,
      lng: 73.9259, // ~6.2 km (temporarily unavailable)
      last_donation: '2026-09-10'
    },
    {
      name: 'Pooja Nair',
      email: 'pooja.ab_neg@bloodlink.org',
      mobile: '+91-9822088888',
      dob: '1997-07-08',
      blood_group: 'AB-',
      availability: 'AVAILABLE',
      locality: 'Kalyani Nagar',
      lat: 18.5463,
      lng: 73.9034, // ~3.6 km from Ruby Hall (5km tier)
      last_donation: '2026-06-28'
    },
    {
      name: 'Arjun Mehta',
      email: 'donor@bloodlink.org', // Primary demo donor account
      mobile: '+91-9822099999',
      dob: '1993-05-19',
      blood_group: 'O+',
      availability: 'AVAILABLE',
      locality: 'Bund Garden',
      lat: 18.5350,
      lng: 73.8810, // ~1.2 km from Ruby Hall (Immediate 5km tier)
      last_donation: '2026-06-01'
    }
  ];

  const donorProfileMap = new Map<string, { profileId: string; userId: string; bloodGroup: string }>();

  for (const d of donorsData) {
    const userId = uuidv4();
    await db.run(
      `INSERT INTO users (id, full_name, email, password_hash, mobile, date_of_birth, role, status, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'donor', 'active', 1, datetime('now'))`,
      [userId, d.name, d.email, donorPasswordHash, d.mobile, d.dob]
    );

    const profileId = uuidv4();
    await db.run(
      `INSERT INTO donor_profiles (id, user_id, blood_group, last_donation_date, donation_type, availability_status, profile_completion_pct, created_at)
       VALUES ($1, $2, $3, $4, 'Whole Blood', $5, 100, datetime('now'))`,
      [profileId, userId, d.blood_group, d.last_donation, d.availability]
    );

    donorProfileMap.set(d.email, { profileId, userId, bloodGroup: d.blood_group });

    // Location
    await db.run(
      `INSERT INTO locations (id, entity_type, entity_id, state, district, taluka, locality, latitude, longitude, created_at)
       VALUES ($1, 'donor', $2, 'Maharashtra', 'Pune', 'Haveli', $3, $4, $5, datetime('now'))`,
      [uuidv4(), profileId, d.locality, d.lat, d.lng]
    );

    // Health Questionnaire
    await db.run(
      `INSERT INTO health_questionnaires (id, donor_id, relevant_medical_history, current_medication, recent_illness, known_allergies, additional_notes, consent_given, created_at)
       VALUES ($1, $2, 'None reported. Verified fit at previous camp.', 'None', 'None in last 6 months', 'None', 'Regular voluntary donor', 1, datetime('now'))`,
      [uuidv4(), profileId]
    );

    // Donation History
    await db.run(
      `INSERT INTO donation_history (id, donor_id, donation_date, units_donated, blood_component, hospital_name, notes, created_at)
       VALUES ($1, $2, $3, 1, 'Whole Blood', 'Ruby Hall Clinic & Research Center', 'Routine voluntary blood donation completed smoothly.', datetime('now'))`,
      [uuidv4(), profileId, d.last_donation]
    );
  }

  // 5. Example Emergency Blood Requests
  const req1Id = uuidv4(); // Critical O+ request in COORDINATING / DONOR_RESPONSES status
  await db.run(
    `INSERT INTO blood_requests (
      id, requester_id, patient_name, patient_age, blood_group, blood_component, units_required,
      hospital_name, hospital_address, latitude, longitude, required_date, required_time,
      priority, status, additional_details, verified_by, verified_at, created_at
    ) VALUES (
      $1, $2, 'Kavita Joshi', 34, 'O+', 'Packed Red Blood Cells (PRBC)', 2,
      'Ruby Hall Clinic & Research Center', '40 Sassoon Road, Sangamvadi, Pune', 18.5312, 73.8741,
      '2026-11-02', '14:00', 'CRITICAL', 'DONOR_RESPONSES',
      'Emergency elective cardiac surgery scheduled. Need 2 PRBC units urgently.',
      $3, datetime('now'), datetime('now', '-2 hours')
    )`,
    [req1Id, requesterIds[0], adminId]
  );

  const req2Id = uuidv4(); // Verified SEARCHING A+ request
  await db.run(
    `INSERT INTO blood_requests (
      id, requester_id, patient_name, patient_age, blood_group, blood_component, units_required,
      hospital_name, hospital_address, latitude, longitude, required_date, required_time,
      priority, status, additional_details, verified_by, verified_at, created_at
    ) VALUES (
      $1, $2, 'Ramesh Patil', 48, 'A+', 'Platelets', 4,
      'Sahyadri Super Speciality Hospital', 'Plot No. 30 C, Erandwane, Karve Road, Pune', 18.5063, 73.8329,
      '2026-11-03', '10:00', 'URGENT', 'SEARCHING',
      'Dengue patient with dropping platelet count (<25,000). Platelet apheresis needed.',
      $3, datetime('now'), datetime('now', '-1 hours')
    )`,
    [req2Id, requesterIds[1], adminId]
  );

  const req3Id = uuidv4(); // Pending Verification B+ request
  await db.run(
    `INSERT INTO blood_requests (
      id, requester_id, patient_name, patient_age, blood_group, blood_component, units_required,
      hospital_name, hospital_address, latitude, longitude, required_date, required_time,
      priority, status, additional_details, created_at
    ) VALUES (
      $1, $2, 'Anil Shirodkar', 62, 'B+', 'Whole Blood', 1,
      'Jehangir Hospital Blood Centre', '32 Sassoon Road, Opp Pune Railway Station', 18.5298, 73.8712,
      '2026-11-04', '11:30', 'SCHEDULED', 'PENDING_VERIFICATION',
      'Orthopedic knee replacement surgery scheduled. Routine crossmatch preparation.',
      datetime('now', '-30 minutes')
    )`,
    [req3Id, requesterIds[2]]
  );

  const req4Id = uuidv4(); // Fulfilled AB+ request
  await db.run(
    `INSERT INTO blood_requests (
      id, requester_id, patient_name, patient_age, blood_group, blood_component, units_required,
      hospital_name, hospital_address, latitude, longitude, required_date, required_time,
      priority, status, additional_details, verified_by, verified_at, created_at
    ) VALUES (
      $1, $2, 'Manish Agarwal', 29, 'AB+', 'Whole Blood', 1,
      'KEM Hospital & Research Centre', '489 Rasta Peth, Sardar Moodliar Road, Pune', 18.5190, 73.8670,
      '2026-10-30', '16:00', 'URGENT', 'FULFILLED',
      'Trauma recovery fulfilled through voluntary coordinator.',
      $3, datetime('now', '-1 day'), datetime('now', '-2 days')
    )`,
    [req4Id, requesterIds[0], adminId]
  );

  // 6. Connect Matches for Request 1 (O+ critical request)
  // Donor 1: Arjun Mehta (ACCEPTED / WILLING)
  const arjunDonor = donorProfileMap.get('donor@bloodlink.org');
  if (arjunDonor) {
    const matchId = uuidv4();
    await db.run(
      `INSERT INTO donor_matches (id, request_id, donor_id, distance_km, search_radius_km, status, match_score, responded_at, response_notes, created_at)
       VALUES ($1, $2, $3, 1.25, 5, 'ACCEPTED', 98.5, datetime('now', '-45 minutes'), 'Willing to report to Ruby Hall Blood Bank at 2:00 PM.', datetime('now', '-2 hours'))`,
      [matchId, req1Id, arjunDonor.profileId]
    );

    // Notification to requester that donor accepted
    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata_json, created_at)
       VALUES ($1, $2, 'Potential Donor Responded!', 'Arjun Mehta (O+) has expressed willingness to assist with your blood request at Ruby Hall Clinic.', 'DONOR_RESPONSE', 0, $3, datetime('now', '-45 minutes'))`,
      [uuidv4(), requesterIds[0], JSON.stringify({ requestId: req1Id, donorName: 'Arjun Mehta', bloodGroup: 'O+' })]
    );

    // Notification to Arjun (donor) for emergency match
    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata_json, created_at)
       VALUES ($1, $2, 'CRITICAL Emergency Blood Request Nearby', 'URGENT: Patient at Ruby Hall Clinic (~1.2 km away) needs O+ Packed Red Blood Cells.', 'EMERGENCY_REQUEST', 1, $3, datetime('now', '-2 hours'))`,
      [uuidv4(), arjunDonor.userId, JSON.stringify({ requestId: req1Id, hospitalName: 'Ruby Hall Clinic' })]
    );
  }

  // Donor 2: Rahul Deshmukh (NOTIFIED)
  const rahulDonor = donorProfileMap.get('rahul.o_pos@bloodlink.org');
  if (rahulDonor) {
    await db.run(
      `INSERT INTO donor_matches (id, request_id, donor_id, distance_km, search_radius_km, status, match_score, created_at)
       VALUES ($1, $2, $3, 2.54, 5, 'NOTIFIED', 94.0, datetime('now', '-2 hours'))`,
      [uuidv4(), req1Id, rahulDonor.profileId]
    );

    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata_json, created_at)
       VALUES ($1, $2, 'Emergency Blood Request Nearby', 'A patient at Ruby Hall Clinic (~2.5 km away) requires O+ blood. Check your dashboard to view details.', 'EMERGENCY_REQUEST', 0, $3, datetime('now', '-2 hours'))`,
      [uuidv4(), rahulDonor.userId, JSON.stringify({ requestId: req1Id })]
    );
  }

  // Donor 3: Rohan Shinde (O- Universal Donor notified)
  const rohanDonor = donorProfileMap.get('rohan.o_neg@bloodlink.org');
  if (rohanDonor) {
    await db.run(
      `INSERT INTO donor_matches (id, request_id, donor_id, distance_km, search_radius_km, status, match_score, created_at)
       VALUES ($1, $2, $3, 3.82, 5, 'NOTIFIED', 91.0, datetime('now', '-2 hours'))`,
      [uuidv4(), req1Id, rohanDonor.profileId]
    );
  }

  // Admin Notification for Pending Request 3
  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata_json, created_at)
     VALUES ($1, $2, 'New Request Awaiting Verification', 'A new blood request for Anil Shirodkar (B+) at Jehangir Hospital requires admin review before matching.', 'ADMIN_ALERT', 0, $3, datetime('now', '-30 minutes'))`,
    [uuidv4(), adminId, JSON.stringify({ requestId: req3Id })]
  );

  console.log('✅ [SEED] Demonstration data successfully loaded:');
  console.log('       - 1 Admin: admin@bloodlink.org (Default evaluation credentials)');
  console.log('       - 9 Voluntary Donors (including donor@bloodlink.org)');
  console.log('       - 3 Requesters (including priya.sharma@example.com)');
  console.log('       - 4 Major Hospitals with blood bank details');
  console.log('       - 4 Emergency Requests across different statuses');
  console.log('       - Active Donor Matches and Notifications');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('🏁 [SEED] Script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [SEED] Error during seeding:', err);
      process.exit(1);
    });
}
