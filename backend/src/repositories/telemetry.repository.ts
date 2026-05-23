import { prisma } from '../server';
import { Prisma, TelemetryEvent } from '@prisma/client';

export class TelemetryRepository {
  async createMany(data: Prisma.TelemetryEventCreateManyInput[]): Promise<void> {
    await prisma.telemetryEvent.createMany({
      data
    });
  }

  async findBySessionId(sessionId: string): Promise<TelemetryEvent[]> {
    return prisma.telemetryEvent.findMany({
      where: { sessionId },
      orderBy: { occurredAt: 'desc' }
    });
  }
}
