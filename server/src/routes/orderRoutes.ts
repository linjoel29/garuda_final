import { Router } from 'express';
import { getOrders, createOrder, updateOrder, deleteOrder, bulkImportOrders } from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getOrders);
router.post('/', createOrder);
router.post('/bulk-import', bulkImportOrders);
router.patch('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
