import { Router } from 'express';
import { exportBackup, importBackup } from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/export', exportBackup);
router.post('/import', importBackup);

export default router;
