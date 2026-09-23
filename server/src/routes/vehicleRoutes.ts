import { Router } from 'express';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getVehicles);
router.post('/', createVehicle);
router.patch('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;
