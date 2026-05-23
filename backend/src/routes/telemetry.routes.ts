import { Router } from 'express';
import { TelemetryController } from '../controllers/telemetry.controller';
import { validate } from '../middleware/validate.middleware';
import { telemetryIngestSchema } from '../middleware/schemas';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const controller = new TelemetryController();

// Anonymous telemetry injection endpoint (securely bound to session tokens inside controller)
router.post('/capture', validate(telemetryIngestSchema), asyncHandler(controller.capture));

export default router;
