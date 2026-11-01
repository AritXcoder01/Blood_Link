import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { db } from './db/connection.js';
import { initDatabase } from './db/init.js';
import { seedDatabase } from './db/seed.js';

import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requesterRoutes from './routes/requesterRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health Check Endpoint (Required by Specification)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Blood_Link Emergency Platform API',
    version: '1.0.0',
    database: {
      mode: db.getMode(),
      productionIntended: 'PostgreSQL with PostGIS',
      activeEngine: db.getMode() === 'postgres' ? 'PostgreSQL' : 'SQLite WebAssembly (Zero-Config Demonstrable Fallback)',
    },
    integrations: {
      googleMaps: config.isGoogleMapsConfigured ? 'Live Production Key' : 'Demo Mode (Interactive OpenStreetMap/Leaflet + Manual Fallback)',
      smsGateway: config.isSmsConfigured ? 'Twilio Live' : 'Demo Mode (Simulated OTP: 123456)',
      pushNotifications: config.isFirebaseConfigured ? 'Firebase Cloud Messaging' : 'Demo Mode (In-App Live Alerts)',
    },
  });
};

app.get('/health', healthHandler);
app.get(`${config.apiPrefix}/health`, healthHandler);
app.get('/api/health', healthHandler);

// API Route Mounts
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/donors', donorRoutes);
apiRouter.use('/requesters', requesterRoutes);
apiRouter.use('/requests', requestRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/hospitals', hospitalRoutes);
apiRouter.use('/notifications', notificationRoutes);

app.use(config.apiPrefix, apiRouter);
// Also mount directly under /api for convenience
app.use('/api', apiRouter);

// Root Welcome
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Blood_Link API - Location-Based Emergency Blood Donor Discovery and Coordination System',
    healthCheck: '/api/v1/health',
    docs: '/api/v1/health',
  });
});

// Global 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: config.nodeEnv === 'development' ? err.message : undefined });
});

async function startServer() {
  try {
    console.log('🩸 [BLOOD_LINK] Initializing system...');
    await initDatabase();

    // Auto-seed if database is freshly created with zero users
    const userCheck = await db.query('SELECT count(*) as count FROM users');
    if (Number(userCheck[0]?.count || 0) === 0) {
      console.log('ℹ️ [BLOOD_LINK] Empty database detected. Running automated seed...');
      await seedDatabase();
    } else {
      console.log(`✅ [BLOOD_LINK] Database contains existing data (${userCheck[0]?.count} users). Ready.`);
    }

    app.listen(config.port, () => {
      console.log(`🚀 [BLOOD_LINK API] Server listening on port ${config.port}`);
      console.log(`🌐 [HEALTH CHECK] http://localhost:${config.port}${config.apiPrefix}/health`);
      if (process.env.NODE_ENV !== 'production' && config.demoMode) {
        console.log(`🔑 [EVALUATION MODE] Demo logins active in local mode (see docs/DEMO_CREDENTIALS.local.md)`);
      }
    });
  } catch (err: any) {
    console.error('❌ [BLOOD_LINK] Startup failed:', err);
    process.exit(1);
  }
}

startServer();
