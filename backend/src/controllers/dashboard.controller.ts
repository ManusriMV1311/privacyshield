import { Request, Response } from 'express';
import { prisma } from '../server';

export class DashboardController {
  getOverview = async (_req: Request, res: Response): Promise<void> => {
    // 1. Core analytics aggregates
    const [
      totalSessions,
      activeSessions,
      totalEvents,
      highRiskSessionsCount,
      eventsByType,
      recentSessions,
      recentEvents
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { active: true } }),
      prisma.telemetryEvent.count(),
      prisma.session.count({ where: { riskScore: { gte: 50 } } }),
      prisma.telemetryEvent.groupBy({
        by: ['eventType'],
        _count: { id: true }
      }),
      prisma.session.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.telemetryEvent.findMany({
        take: 5,
        orderBy: { occurredAt: 'desc' }
      })
    ]);

    // 2. Format group counts into clear objects
    const eventBreakdown: Record<string, number> = {};
    eventsByType.forEach((group) => {
      eventBreakdown[group.eventType] = group._count.id;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSessions,
          activeSessions,
          totalEvents,
          highRiskSessionsCount
        },
        eventBreakdown,
        recentSessions,
        recentEvents
      }
    });
  };
}
