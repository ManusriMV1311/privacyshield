import { prisma } from '../server';
import { Prisma, Session, WatermarkMetadata } from '@prisma/client';

export class SessionRepository {
  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return prisma.session.create({
      data
    });
  }

  async findById(id: string): Promise<(Session & { watermark: WatermarkMetadata | null }) | null> {
    return prisma.session.findUnique({
      where: { id },
      include: { watermark: true }
    }) as Promise<(Session & { watermark: WatermarkMetadata | null }) | null>;
  }

  async findByToken(sessionToken: string): Promise<(Session & { watermark: WatermarkMetadata | null }) | null> {
    return prisma.session.findUnique({
      where: { sessionToken },
      include: { watermark: true }
    }) as Promise<(Session & { watermark: WatermarkMetadata | null }) | null>;
  }

  async update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data
    });
  }

  async addRiskScoreHistory(
    sessionId: string,
    previousScore: number,
    newScore: number,
    changeReason: string
  ): Promise<void> {
    await prisma.riskScoreHistory.create({
      data: {
        sessionId,
        previousScore,
        newScore,
        changeReason
      }
    });
  }
}
