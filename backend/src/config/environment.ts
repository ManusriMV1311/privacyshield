import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environmental config files
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const environmentSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Defaults to a dummy URL in local test runners to permit isolated mock testing
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://privacyshield_user:secure_db_pass_9988@localhost:5432/privacyshield_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().min(8).default('access_token_super_secret_key_12345'),
  JWT_REFRESH_SECRET: z.string().min(8).default('refresh_token_super_secret_key_67890'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000) // 1 minute default
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
