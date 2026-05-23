import * as crypto from 'crypto';
import { SessionRepository } from '../repositories/session.repository';
import { WatermarkService } from './watermark.service';
import { Session, WatermarkMetadata } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class SessionService {
  private sessionRepository = new SessionRepository();
  private watermarkService = new WatermarkService();

  async startSession(
    extensionVersion: string,
    deviceMetadata: Record<string, any>,
    userAgent = 'anonymous_device'
  ): Promise<{ session: Session; watermark: WatermarkMetadata }> {
    const sessionToken = `session_token_${crypto.randomUUID().replace(/-/g, '')}`;

    // 1. Create baseline session record
    const session = await this.sessionRepository.create({
      sessionToken,
      extensionVersion,
      deviceMetadata: deviceMetadata ?? {},
      active: true,
      riskScore: 0,
      protectionLvl: 1
    });

    // 2. Generate and link dynamic forensic watermarking
    const watermark = await this.watermarkService.generateWatermark(
      session.id,
      sessionToken,
      userAgent
    );

    return {
      session,
      watermark
    };
  }

  async endSession(sessionToken: string): Promise<Session> {
    const session = await this.sessionRepository.findByToken(sessionToken);
    if (!session) {
      throw new NotFoundError(`Active session matching this token was not found.`);
    }

    return this.sessionRepository.update(session.id, {
      active: false
    });
  }

  async getSessionState(sessionId: string): Promise<Session & { watermark: WatermarkMetadata | null }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session with ID '${sessionId}' was not found.`);
    }
    return session;
  }

  async getSessionByToken(sessionToken: string): Promise<Session & { watermark: WatermarkMetadata | null }> {
    const session = await this.sessionRepository.findByToken(sessionToken);
    if (!session) {
      throw new NotFoundError(`Session matching this token was not found.`);
    }
    return session;
  }
}
