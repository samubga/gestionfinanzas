import { Router } from 'express';
import { getIncomes, createIncome, updateIncome, deleteIncome, deleteIncomesBulk, updateIncomesBulk } from '../controllers/income.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getIncomes);
router.post('/', createIncome);
router.post('/bulk-delete', deleteIncomesBulk);
router.post('/bulk-update', updateIncomesBulk);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

export default router;
