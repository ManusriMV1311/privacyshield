import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const controller = new DashboardController();

// Admin analytical reports endpoint
router.get('/overview', authenticateJWT, requireAdmin, asyncHandler(controller.getOverview));

export default router;
