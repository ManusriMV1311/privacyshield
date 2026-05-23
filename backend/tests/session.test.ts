import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/server';

jest.mock('../src/server', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(true),
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    watermarkMetadata: {
      create: jest.fn()
    }
  }
}));

describe('=== Client Session API Endpoints ===', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/sessions/start', () => {
    it('should start an anonymous client session and issue watermark config', async () => {
      const mockSession = {
        id: 'session-uuid-2222',
        sessionToken: 'session_token_mocked_xxxx',
        active: true,
        riskScore: 0,
        protectionLvl: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockWatermark = {
        id: 'wm-uuid-3333',
        sessionId: 'session-uuid-2222',
        userHash: 'sha256_mock_user',
        watermarkToken: 'wm_token_mocked_yyyy',
        createdAt: new Date()
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.watermarkMetadata.create as jest.Mock).mockResolvedValue(mockWatermark);

      const res = await request(app)
        .post('/api/v1/sessions/start')
        .send({
          extensionVersion: '1.0.0',
          deviceMetadata: { browser: 'Chrome', os: 'Windows' }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.session.sessionToken).toBe('session_token_mocked_xxxx');
      expect(res.body.watermark.userHash).toBe('sha256_mock_user');
      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      expect(prisma.watermarkMetadata.create).toHaveBeenCalledTimes(1);
    });

    it('should reject session creation when missing extension version', async () => {
      const res = await request(app)
        .post('/api/v1/sessions/start')
        .send({
          deviceMetadata: {}
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/v1/sessions/end', () => {
    it('should terminate an active session successfully', async () => {
      const mockSession = {
        id: 'session-uuid-2222',
        sessionToken: 'session_token_mocked_xxxx',
        active: true,
        riskScore: 0,
        protectionLvl: 1
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        active: false
      });

      const res = await request(app)
        .post('/api/v1/sessions/end')
        .send({
          sessionToken: 'session_token_mocked_xxxx'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('terminated');
      expect(prisma.session.update).toHaveBeenCalledTimes(1);
    });
  });
});
