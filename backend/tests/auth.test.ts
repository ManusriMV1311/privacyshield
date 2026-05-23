import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/server';
import * as bcrypt from 'bcryptjs';

// Mock database prisma clients
jest.mock('../src/server', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(true),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn()
    }
  }
}));

describe('=== Authentication API Endpoints ===', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new administrator successfully', async () => {
      const mockUser = {
        id: 'user-uuid-1111',
        email: 'test_admin@privacyshield.local',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test_admin@privacyshield.local',
          password: 'secure_password_999'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test_admin@privacyshield.local');
      expect(res.body.data.role).toBe('ADMIN');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should fail registration when input email schema is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation Error');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an administrator with valid credentials and return JWT tokens', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin_password_123', salt);
      const mockUser = {
        id: 'user-uuid-1111',
        email: 'admin@privacyshield.local',
        passwordHash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@privacyshield.local',
          password: 'admin_password_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@privacyshield.local');
    });

    it('should reject login for incorrect passwords', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('correct_password', salt);
      const mockUser = {
        id: 'user-uuid-1111',
        email: 'admin@privacyshield.local',
        passwordHash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@privacyshield.local',
          password: 'wrong_password'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid email or password');
    });
  });
});
