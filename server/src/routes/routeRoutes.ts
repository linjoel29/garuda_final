import { Router } from 'express';
import { generateRoutes, getRoutes, getRouteById, simulateDelay } from '../controllers/routeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/generate', generateRoutes);
router.get('/', getRoutes);
router.get('/:id', getRouteById);
router.post('/:id/simulate-delay', simulateDelay);
router.post('/:id/recompute', simulateDelay);

export default router;
