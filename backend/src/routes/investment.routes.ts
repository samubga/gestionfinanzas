import { Router } from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '../controllers/investment.controller';
import { getInvestmentMarketAnalysis, getPortfolioMarketSummary } from '../controllers/investmentMarket.controller';
import { createInvestmentTransaction, deleteInvestmentTransaction, getActiveInvestmentTransactionSummaries, getInvestmentTransactions, importTradeRepublicPdf, updateInvestmentTransaction } from '../controllers/investmentTransaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getInvestments);
router.get('/market/summary', authMiddleware, getPortfolioMarketSummary);
router.get('/market/analysis', authMiddleware, getInvestmentMarketAnalysis);
router.get('/transactions/summary', authMiddleware, getActiveInvestmentTransactionSummaries);
router.post('/:id/transactions/import-pdf', authMiddleware, importTradeRepublicPdf);
router.get('/:id/transactions', authMiddleware, getInvestmentTransactions);
router.post('/:id/transactions', authMiddleware, createInvestmentTransaction);
router.put('/:id/transactions/:transactionId', authMiddleware, updateInvestmentTransaction);
router.delete('/:id/transactions/:transactionId', authMiddleware, deleteInvestmentTransaction);
router.post('/', authMiddleware, createInvestment);
router.put('/:id', authMiddleware, updateInvestment);
router.delete('/:id', authMiddleware, deleteInvestment);

export default router;
