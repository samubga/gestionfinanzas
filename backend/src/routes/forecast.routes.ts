import { Router } from 'express';
import { getForecasts, createForecast, updateForecast, deleteForecast, getComparison } from '../controllers/forecast.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all forecast routes
router.use(authMiddleware);

router.get('/', getForecasts);
router.post('/', createForecast);
router.get('/comparison', getComparison);
router.put('/:id', updateForecast);
router.delete('/:id', deleteForecast);

export default router;
