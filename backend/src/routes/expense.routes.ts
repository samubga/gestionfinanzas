import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense, duplicateExpense, deleteExpensesBulk } from '../controllers/expense.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getExpenses);
router.post('/', createExpense);
router.post('/bulk-delete', deleteExpensesBulk);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
router.post('/:id/duplicate', duplicateExpense);

export default router;
