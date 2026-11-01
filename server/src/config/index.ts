import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'blood_link_dev_jwt_secret_placeholder'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbClient: (process.env.DB_CLIENT || (isProduction ? 'postgres' : 'sqlite')).toLowerCase(),
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  isGoogleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'demo'),
  isSmsConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  isFirebaseConfigured: Boolean(process.env.FIREBASE_SERVER_KEY),
  demoMode: process.env.DEMO_MODE !== 'false' && !isProduction,
};
