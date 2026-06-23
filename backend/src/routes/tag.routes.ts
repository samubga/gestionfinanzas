import { Router } from 'express';
import { getTags, createTag, deleteTag } from '../controllers/tag.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getTags);
router.post('/', createTag);
router.delete('/:id', deleteTag);

export default router;
