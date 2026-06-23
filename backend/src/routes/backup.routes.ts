import { Router } from 'express';
import { exportBackup, importBackup, parseCSVPreview, importTransactions } from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/export', exportBackup);
router.post('/import', importBackup);
router.post('/parse-csv-preview', parseCSVPreview);
router.post('/import-transactions', importTransactions);

export default router;
