import { Router } from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '../controllers/investment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getInvestments);
router.post('/', authMiddleware, createInvestment);
router.put('/:id', authMiddleware, updateInvestment);
router.delete('/:id', authMiddleware, deleteInvestment);

export default router;
