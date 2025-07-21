import { Router } from 'express';
import proveRoutes from './prove';
import submitRoutes from './submit';

const router = Router();

// Mount proof generation routes
router.use('/', proveRoutes);

// Mount proof submission routes  
router.use('/', submitRoutes);

export default router;