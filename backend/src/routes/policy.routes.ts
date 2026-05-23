import { Router } from 'express';
import { PolicyController } from '../controllers/policy.controller';
import { validate } from '../middleware/validate.middleware';
import { updatePolicySchema } from '../middleware/schemas';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const controller = new PolicyController();

// Extension runtime policy reading
router.get('/default', asyncHandler(controller.getDefault));

// Admin-only policy updates
router.put('/:id', authenticateJWT, requireAdmin, validate(updatePolicySchema), asyncHandler(controller.update));

export default router;
