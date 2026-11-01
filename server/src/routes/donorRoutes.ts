import { Router } from 'express';
import { donorController } from '../controllers/donorController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('donor'));

router.get('/profile', donorController.getProfile);
router.patch('/availability', donorController.updateAvailability);
router.get('/requests', donorController.getAssignedRequests);
router.post('/requests/:requestId/respond', donorController.respondToRequest);
router.get('/history', donorController.getDonationHistory);
router.post('/history', donorController.addDonationRecord);

export default router;
