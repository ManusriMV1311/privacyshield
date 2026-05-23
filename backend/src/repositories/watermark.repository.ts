import { prisma } from '../server';
import { Prisma, WatermarkMetadata } from '@prisma/client';

export class WatermarkRepository {
  async create(data: Prisma.WatermarkMetadataUncheckedCreateInput): Promise<WatermarkMetadata> {
    return prisma.watermarkMetadata.create({
      data
    });
  }

  async findBySessionId(sessionId: string): Promise<WatermarkMetadata | null> {
    return prisma.watermarkMetadata.findUnique({
      where: { sessionId }
    });
  }
}
