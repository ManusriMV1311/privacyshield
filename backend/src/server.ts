import app from './app';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function bootstrap() {
  try {
    logger.info('Attempting database connection check...');
    await prisma.$connect();
    logger.info('✔ Connection to PostgreSQL database verified successfully.');

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 PrivacyShield MVP Control Layer running at: http://localhost:${config.PORT}`);
      logger.info(`   Environment: [${config.NODE_ENV}]`);
    });

    const shutdown = async () => {
      logger.info('Shutdown signal captured. Disposing Express server scope...');
      server.close(async () => {
        logger.info('Express server terminated. Disconnecting Prisma DB clients...');
        await prisma.$disconnect();
        logger.info('Database links cleanly severed. Shutdown execution completed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error({ err }, '❌ Server boot operations halted due to unhandled startup errors');
    process.exit(1);
  }
}

bootstrap();
export { prisma }; // Expose single database context client reference
