import { Router } from 'express';
import { getBanks, createCustomBank } from '../controllers/bank.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getBanks);
router.post('/', createCustomBank);

export default router;
