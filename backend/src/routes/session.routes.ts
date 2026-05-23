import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { validate } from '../middleware/validate.middleware';
import { startSessionSchema, endSessionSchema } from '../middleware/schemas';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const controller = new SessionController();

router.post('/start', validate(startSessionSchema), asyncHandler(controller.start));
router.post('/end', validate(endSessionSchema), asyncHandler(controller.end));
router.get('/:id', authenticateJWT, requireAdmin, asyncHandler(controller.getState));

export default router;
