import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/environment';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRouter } from './routes';

const app = express();

// 1. Injected Security Headers via Helmet
app.use(helmet());

// 2. Strict CORS checks
app.use(
  cors({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true
  })
);

// 3. Strict limits on Body parsing to avoid memory starvation attacks
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Integrated Request Logger (Pino-HTTP)
app.use(loggerMiddleware);

// 5. Global Endpoint Rate Limiting
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: 'Too many requests from this client. Ingestion rate-limit lockout triggered.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// 6. Connect core modular API endpoints
app.use('/api/v1', apiRouter);

// 7. Health Check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', environment: config.NODE_ENV });
});

// 8. Catch-all for undefined endpoints
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// 9. Centralized Operational/Uncaught Error handling boundary
app.use(errorMiddleware);

export default app;
