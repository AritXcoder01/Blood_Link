import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { BloodGroup } from '../types/index.js';

const donorRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  dateOfBirth: z.string().refine((val) => {
    const dob = new Date(val);
    const now = new Date();
    const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }, 'Donors must be at least 18 years of age'),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  donationType: z.string().default('Whole Blood'),
  lastDonationDate: z.string().optional().nullable(),
  state: z.string().min(2),
  district: z.string().min(2),
  taluka: z.string().min(2),
  locality: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  medicalHistory: z.string().optional(),
  currentMedication: z.string().optional(),
  recentIllness: z.string().optional(),
  knownAllergies: z.string().optional(),
  additionalNotes: z.string().optional(),
  consentGiven: z.boolean().refine((val) => val === true, 'Consent is required'),
});

const requesterRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  dateOfBirth: z.string().optional(),
  requesterType: z.enum(['Patient', 'Attendant']),
  state: z.string().min(2),
  district: z.string().min(2),
  taluka: z.string().min(2),
  locality: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number().default(18.5204),
  longitude: z.number().default(73.8567),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async registerDonor(req: Request, res: Response): Promise<void> {
    try {
      const parsed = donorRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0]?.message || 'Validation failed',
          errors: parsed.error.errors,
        });
        return;
      }

      const data = parsed.data;

      // Check existing email
      const existingUser = await db.queryOne('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const userId = uuidv4();
      const profileId = uuidv4();
      const locationId = uuidv4();
      const questionnaireId = uuidv4();

      // 1. Insert User
      await db.run(
        `INSERT INTO users (id, full_name, email, password_hash, mobile, date_of_birth, role, status, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'donor', 'active', 1, datetime('now'))`,
        [userId, data.fullName, data.email.toLowerCase(), passwordHash, data.mobile, data.dateOfBirth]
      );

      // 2. Insert Donor Profile
      await db.run(
        `INSERT INTO donor_profiles (id, user_id, blood_group, last_donation_date, donation_type, availability_status, profile_completion_pct, created_at)
         VALUES ($1, $2, $3, $4, $5, 'AVAILABLE', 100, datetime('now'))`,
        [profileId, userId, data.bloodGroup, data.lastDonationDate || null, data.donationType]
      );

      // 3. Insert Location
      await db.run(
        `INSERT INTO locations (id, entity_type, entity_id, state, district, taluka, locality, address, latitude, longitude, created_at)
         VALUES ($1, 'donor', $2, $3, $4, $5, $6, $7, $8, $9, datetime('now'))`,
        [locationId, profileId, data.state, data.district, data.taluka, data.locality, data.address || '', data.latitude, data.longitude]
      );

      // 4. Insert Health Questionnaire
      await db.run(
        `INSERT INTO health_questionnaires (id, donor_id, relevant_medical_history, current_medication, recent_illness, known_allergies, additional_notes, consent_given, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, datetime('now'))`,
        [questionnaireId, profileId, data.medicalHistory || '', data.currentMedication || '', data.recentIllness || '', data.knownAllergies || '', data.additionalNotes || '']
      );

      const token = jwt.sign(
        { userId, email: data.email.toLowerCase(), role: 'donor', fullName: data.fullName },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      res.status(201).json({
        success: true,
        message: 'Donor account created successfully. Welcome to Blood_Link!',
        token,
        user: {
          id: userId,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          role: 'donor',
          bloodGroup: data.bloodGroup,
          availabilityStatus: 'AVAILABLE',
        },
        disclaimer: 'Registration records donor willingness. Final medical eligibility and transfusion safety are determined by authorized blood center personnel.',
      });
    } catch (err: any) {
      console.error('Error registering donor:', err);
      res.status(500).json({ success: false, message: 'Internal server error while creating donor account' });
    }
  },

  async registerRequester(req: Request, res: Response): Promise<void> {
    try {
      const parsed = requesterRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.errors[0]?.message || 'Validation failed',
          errors: parsed.error.errors,
        });
        return;
      }

      const data = parsed.data;

      const existingUser = await db.queryOne('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const userId = uuidv4();
      const profileId = uuidv4();
      const locationId = uuidv4();

      await db.run(
        `INSERT INTO users (id, full_name, email, password_hash, mobile, date_of_birth, role, status, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'requester', 'active', 1, datetime('now'))`,
        [userId, data.fullName, data.email.toLowerCase(), passwordHash, data.mobile, data.dateOfBirth || null]
      );

      await db.run(
        `INSERT INTO requester_profiles (id, user_id, requester_type, created_at)
         VALUES ($1, $2, $3, datetime('now'))`,
        [profileId, userId, data.requesterType]
      );

      await db.run(
        `INSERT INTO locations (id, entity_type, entity_id, state, district, taluka, locality, address, latitude, longitude, created_at)
         VALUES ($1, 'user', $2, $3, $4, $5, $6, $7, $8, $9, datetime('now'))`,
        [locationId, userId, data.state, data.district, data.taluka, data.locality, data.address || '', data.latitude, data.longitude]
      );

      const token = jwt.sign(
        { userId, email: data.email.toLowerCase(), role: 'requester', fullName: data.fullName },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      res.status(201).json({
        success: true,
        message: 'Requester account created successfully.',
        token,
        user: {
          id: userId,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          role: 'requester',
          requesterType: data.requesterType,
        },
      });
    } catch (err: any) {
      console.error('Error registering requester:', err);
      res.status(500).json({ success: false, message: 'Internal server error while creating requester account' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Please provide email and password' });
        return;
      }

      const { email, password } = parsed.data;
      const user = await db.queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      if (user.status === 'suspended') {
        res.status(403).json({ success: false, message: 'Your account has been suspended by an administrator.' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      // Fetch role-specific details
      let roleDetails: any = {};
      if (user.role === 'donor') {
        const donor = await db.queryOne(
          `SELECT dp.*, l.locality, l.district, l.taluka, l.latitude, l.longitude
           FROM donor_profiles dp
           LEFT JOIN locations l ON l.entity_id = dp.id AND l.entity_type = 'donor'
           WHERE dp.user_id = $1`,
          [user.id]
        );
        roleDetails = donor || {};
      } else if (user.role === 'requester') {
        const reqProf = await db.queryOne(
          `SELECT rp.*, l.locality, l.district
           FROM requester_profiles rp
           LEFT JOIN locations l ON l.entity_id = rp.user_id AND l.entity_type = 'user'
           WHERE rp.user_id = $1`,
          [user.id]
        );
        roleDetails = reqProf || {};
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, fullName: user.full_name },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          status: user.status,
          isVerified: Boolean(user.is_verified),
          ...roleDetails,
        },
      });
    } catch (err: any) {
      console.error('Error logging in:', err);
      res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
  },

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await db.queryOne('SELECT id, full_name, email, mobile, role, status, is_verified, created_at FROM users WHERE id = $1', [req.user.userId]);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      let profile: any = null;
      let location: any = null;

      if (user.role === 'donor') {
        profile = await db.queryOne('SELECT * FROM donor_profiles WHERE user_id = $1', [user.id]);
        if (profile) {
          location = await db.queryOne("SELECT * FROM locations WHERE entity_id = $1 AND entity_type = 'donor'", [profile.id]);
        }
      } else if (user.role === 'requester') {
        profile = await db.queryOne('SELECT * FROM requester_profiles WHERE user_id = $1', [user.id]);
        location = await db.queryOne("SELECT * FROM locations WHERE entity_id = $1 AND entity_type = 'user'", [user.id]);
      }

      res.json({
        success: true,
        user: {
          ...user,
          is_verified: Boolean(user.is_verified),
          profile,
          location,
        },
      });
    } catch (err: any) {
      console.error('Error in /me:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { mobile, otpCode } = req.body;

    // Strict Production Gate: Prohibit simulated OTP in production mode
    if (process.env.NODE_ENV === 'production') {
      res.status(400).json({
        success: false,
        message: 'Live SMS gateway integration required for OTP verification in production.',
      });
      return;
    }

    // Development / Local Demo Mode simulated verification
    if (config.demoMode && (otpCode === '123456' || otpCode === '000000')) {
      if (mobile) {
        await db.run('UPDATE users SET is_verified = 1 WHERE mobile = $1', [mobile]);
      }
      res.json({
        success: true,
        message: 'Mobile number verified successfully (Development Mode Verified).',
      });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid OTP code.' });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully' });
  },
};
