import { Router } from 'express';
import { getDashboardStats, getSavingGoal, upsertSavingGoal } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/saving-goal', getSavingGoal);
router.post('/saving-goal', upsertSavingGoal);

export default router;
