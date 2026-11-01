import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/register/donor', authController.registerDonor);
router.post('/register/requester', authController.registerRequester);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authController.logout);
router.post('/verify-otp', authController.verifyOtp);

export default router;
