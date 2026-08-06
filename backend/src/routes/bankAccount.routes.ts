import { Router } from 'express';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../controllers/bankAccount.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getBankAccounts);
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);

export default router;
