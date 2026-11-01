import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  jwtSecret: process.env.JWT_SECRET || 'blood_link_super_secret_jwt_key_2026_final_year_project',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbClient: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/blood_link',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  isGoogleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'demo'),
  isSmsConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  isFirebaseConfigured: Boolean(process.env.FIREBASE_SERVER_KEY),
  demoMode: process.env.DEMO_MODE !== 'false',
};
