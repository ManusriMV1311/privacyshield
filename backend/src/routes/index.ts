import { Router } from 'express';
import authRoutes from './auth.routes';
import sessionRoutes from './session.routes';
import telemetryRoutes from './telemetry.routes';
import policyRoutes from './policy.routes';
import dashboardRoutes from './dashboard.routes';

export const apiRouter = Router();

// Modular registration of all features
apiRouter.use('/auth', authRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/events', telemetryRoutes);
apiRouter.use('/policies', policyRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
