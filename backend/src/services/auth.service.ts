import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { config } from '../config/environment';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { User, UserRole } from '@prisma/client';

export class AuthService {
  private userRepository = new UserRepository();

  async register(email: string, passwordPlain: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('User account with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    return this.userRepository.create({
      email,
      passwordHash,
      role: UserRole.ADMIN // Default role for standard dashboard registration
    });
  }

  async login(
    email: string,
    passwordPlain: string
  ): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password credentials.');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password credentials.');
    }

    const { passwordHash, ...safeUser } = user;
    const tokens = this.generateTokenPair(safeUser);

    return {
      user: safeUser,
      ...tokens
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new UnauthorizedError('Identity associated with this refresh token was not found.');
      }

      const { passwordHash, ...safeUser } = user;
      const accessToken = jwt.sign(
        { id: safeUser.id, email: safeUser.email, role: safeUser.role },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      return { accessToken };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }
  }

  private generateTokenPair(user: Omit<User, 'passwordHash'>): { accessToken: string; refreshToken: string } {
    const payload = { id: user.id, email: user.email, role: user.role };
    
    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
