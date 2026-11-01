import { Router } from 'express';
import { requesterController } from '../controllers/requesterController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('requester'));

router.get('/profile', requesterController.getProfile);

export default router;
