import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/server';

jest.mock('../src/server', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(true),
    session: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    telemetryEvent: {
      createMany: jest.fn()
    },
    riskScoreHistory: {
      create: jest.fn()
    }
  }
}));

describe('=== Telemetry Ingestion API Endpoints ===', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/events/capture', () => {
    const mockSession = {
      id: 'session-uuid-2222',
      sessionToken: 'session_token_xxxx',
      active: true,
      riskScore: 10,
      protectionLvl: 1,
      extensionVersion: '1.0.0'
    };

    it('should successfully ingest individual client telemetry events and elevate threat scores', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        riskScore: 35, // 10 + 25 (Screenshot weight)
        protectionLvl: 2
      });

      const res = await request(app)
        .post('/api/v1/events/capture')
        .set('Authorization', 'Bearer session_token_xxxx')
        .send({
          eventType: 'SCREENSHOT_ATTEMPT',
          severity: 3,
          metadata: { screen: 'main' },
          occurredAt: new Date().toISOString()
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.riskScore).toBe(35);
      expect(res.body.data.protectionLvl).toBe(2);
      expect(prisma.telemetryEvent.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.session.update).toHaveBeenCalledTimes(1);
    });

    it('should reject telemetry requests when authorization bearer token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/events/capture')
        .send({
          eventType: 'WINDOW_BLUR',
          severity: 2,
          metadata: {},
          occurredAt: new Date().toISOString()
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('token was missing');
    });

    it('should reject telemetry when timestamp skew is too high (timeline replay protection)', async () => {
      const ancientTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago (> 5m limit)

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const res = await request(app)
        .post('/api/v1/events/capture')
        .set('Authorization', 'Bearer session_token_xxxx')
        .send({
          eventType: 'WINDOW_BLUR',
          severity: 2,
          metadata: {},
          occurredAt: ancientTime
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('timestamp skew');
    });
  });
});
