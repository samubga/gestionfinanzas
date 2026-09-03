import { Router } from 'express';
import { register, login, logout, getMe, updateStartingBalance, forgotPassword, resetPassword, changePassword, changeEmail, updateProfile, updateDisplayPreferences } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, getMe);
router.put('/starting-balance', authMiddleware, updateStartingBalance);
router.put('/password', authMiddleware, changePassword);
router.put('/email', authMiddleware, changeEmail);
router.put('/profile', authMiddleware, updateProfile);
router.put('/display-preferences', authMiddleware, updateDisplayPreferences);

export default router;
