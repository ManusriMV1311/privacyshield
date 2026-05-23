import { z } from 'zod';
import { TelemetryType } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format.'),
    password: z.string().min(8, 'Password must be at least 8 characters long.')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format.'),
    password: z.string()
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required.')
  })
});

export const startSessionSchema = z.object({
  body: z.object({
    extensionVersion: z.string().min(1, 'Extension version is required.'),
    deviceMetadata: z.record(z.any()).default({})
  })
});

export const endSessionSchema = z.object({
  body: z.object({
    sessionToken: z.string().min(1, 'Session token is required.')
  })
});

// Support both batched arrays and singular direct events
export const telemetryIngestSchema = z.object({
  body: z.union([
    z.object({
      events: z.array(
        z.object({
          eventType: z.nativeEnum(TelemetryType, {
            errorMap: () => ({ message: 'Invalid telemetry event type.' })
          }),
          severity: z.number().int().min(1).max(5).optional().default(1),
          metadata: z.record(z.any()).default({}),
          occurredAt: z.string().datetime().optional()
        })
      ).min(1, 'Batch events array cannot be empty.')
    }),
    z.object({
      eventType: z.nativeEnum(TelemetryType, {
        errorMap: () => ({ message: 'Invalid telemetry event type.' })
      }),
      severity: z.number().int().min(1).max(5).optional().default(1),
      metadata: z.record(z.any()).default({}),
      occurredAt: z.string().datetime().optional()
    })
  ])
});

export const updatePolicySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid policy ID format.')
  }),
  body: z.object({
    blurRadius: z.number().int().min(1).max(100).optional(),
    transitionSpeedMs: z.number().int().min(10).max(5000).optional(),
    lockoutMessage: z.string().min(1).optional(),
    watermarkOpacity: z.number().min(0.01).max(1.0).optional(),
    watermarkRotation: z.number().int().min(-360).max(360).optional(),
    watermarkFontSize: z.number().int().min(8).max(72).optional(),
    watermarkDensity: z.enum(['low', 'medium', 'high']).optional(),
    escalationThreshold2: z.number().int().min(0).max(100).optional(),
    escalationThreshold3: z.number().int().min(0).max(100).optional(),
    escalationThreshold4: z.number().int().min(0).max(100).optional()
  })
});
