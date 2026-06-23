import { Router } from 'express';
import { exportBackup, importBackup, importCaixaBankCSV } from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/export', exportBackup);
router.post('/import', importBackup);
router.post('/import-csv', importCaixaBankCSV);

export default router;
