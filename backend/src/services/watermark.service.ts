import * as crypto from 'crypto';
import { WatermarkRepository } from '../repositories/watermark.repository';
import { WatermarkMetadata } from '@prisma/client';

export class WatermarkService {
  private watermarkRepository = new WatermarkRepository();

  async generateWatermark(
    sessionId: string,
    sessionToken: string,
    userAgent = 'anonymous_device'
  ): Promise<WatermarkMetadata> {
    // Generate a unique 16-character SHA-256 slice for display
    const userHash = crypto
      .createHash('sha256')
      .update(`${sessionToken}-${userAgent}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`)
      .digest('hex')
      .substring(0, 16);

    const watermarkToken = `wm_token_${crypto.randomUUID().replace(/-/g, '')}`;

    return this.watermarkRepository.create({
      sessionId,
      userHash,
      watermarkToken
    });
  }
}
