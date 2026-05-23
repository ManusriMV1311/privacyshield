import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshSchema } from '../middleware/schemas';
import { authenticateJWT } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
router.get('/me', authenticateJWT, asyncHandler(controller.me));

export default router;
