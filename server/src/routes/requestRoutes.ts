import { Router } from 'express';
import { requestController } from '../controllers/requestController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', requestController.createRequest);
router.get('/', requestController.getRequests);
router.get('/:id', requestController.getRequestById);
router.patch('/:id/cancel', requestController.cancelRequest);
router.get('/:id/matches', requestController.getMatches);

export default router;
