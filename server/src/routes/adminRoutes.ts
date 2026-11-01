import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/requests/:id/verify', adminController.verifyRequest);
router.patch('/requests/:id/reject', adminController.rejectRequest);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
