import { Router } from 'express';
import { register, login, getMe, updateStartingBalance } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/starting-balance', authMiddleware, updateStartingBalance);

export default router;
