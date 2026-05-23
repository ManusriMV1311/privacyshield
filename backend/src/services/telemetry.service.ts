import { TelemetryRepository } from '../repositories/telemetry.repository';
import { SessionService } from './session.service';
import { RiskScoringService } from './risk-scoring.service';
import { TelemetryType, Session } from '@prisma/client';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface TelemetryEventInput {
  eventType: TelemetryType;
  severity: number;
  metadata: Record<string, any>;
  occurredAt: string;
}

export class TelemetryService {
  private telemetryRepository = new TelemetryRepository();
  private sessionService = new SessionService();
  private riskScoringService = new RiskScoringService();

  // Maximum allowed events per request batch
  private readonly MAX_BATCH_SIZE = 50;
  
  // Maximum allowed timestamp skew (5 minutes in milliseconds) to mitigate replay spoofing
  private readonly MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

  async ingestTelemetryBatch(
    sessionToken: string,
    events: TelemetryEventInput[]
  ): Promise<Session> {
    // 1. Resolve session linkage
    const session = await this.sessionService.getSessionByToken(sessionToken);
    if (!session.active) {
      throw new BadRequestError('Ingestion rejected: This session has been terminated.');
    }

    // 2. Validate batch sizing constraints
    if (!events || events.length === 0) {
      throw new BadRequestError('Ingestion rejected: Telemetry batch cannot be empty.');
    }

    if (events.length > this.MAX_BATCH_SIZE) {
      throw new BadRequestError(
        `Ingestion rejected: Telemetry batch exceeds maximum limit of ${this.MAX_BATCH_SIZE} events.`
      );
    }

    const now = Date.now();
    const eventTypes: TelemetryType[] = [];
    const formattedEvents = events.map((event) => {
      // Validate telemetry enums strictly
      if (!Object.values(TelemetryType).includes(event.eventType)) {
        throw new BadRequestError(`Ingestion rejected: Invalid eventType '${event.eventType}' encountered.`);
      }

      // Check for replay attacks and timeline tampering
      const eventTime = new Date(event.occurredAt).getTime();
      if (isNaN(eventTime)) {
        throw new BadRequestError('Ingestion rejected: Malformed occurredAt timestamp.');
      }

      const skew = Math.abs(now - eventTime);
      if (skew > this.MAX_TIMESTAMP_SKEW_MS) {
        throw new BadRequestError(
          'Ingestion rejected: Telemetry timestamp skew is too high (potential replay attack).'
        );
      }

      eventTypes.push(event.eventType);

      return {
        sessionId: session.id,
        eventType: event.eventType,
        severity: Math.min(5, Math.max(1, event.severity)), // Restrict severity score boundaries [1-5]
        metadata: event.metadata ?? {},
        occurredAt: new Date(event.occurredAt)
      };
    });

    // 3. Batch commit events to DB
    logger.info(`[TelemetryEngine] Ingesting ${formattedEvents.length} events for session: ${session.id}`);
    await this.telemetryRepository.createMany(formattedEvents);

    // 4. Run risk recalculation for the session
    return this.riskScoringService.processEventsAndAdjustRisk(session.id, eventTypes);
  }
}
