import { Router } from 'express';
import { getTransfers, createTransfer, updateTransfer, deleteTransfer } from '../controllers/transfer.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getTransfers);
router.post('/', createTransfer);
router.put('/:id', updateTransfer);
router.delete('/:id', deleteTransfer);

export default router;
