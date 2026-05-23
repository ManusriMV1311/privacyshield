import { Request, Response } from 'express';
import { TelemetryService, TelemetryEventInput } from '../services/telemetry.service';
import { UnauthorizedError, BadRequestError } from '../utils/errors';

export class TelemetryController {
  private telemetryService = new TelemetryService();

  capture = async (req: Request, res: Response): Promise<void> => {
    // 1. Extract Bearer Session Token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Session verification token was missing or malformed.');
    }
    const sessionToken = authHeader.split(' ')[1];

    // 2. Normalize and adapt input formats (Single event vs Batched arrays)
    let rawEvents: any[] = [];
    if (req.body.events && Array.isArray(req.body.events)) {
      rawEvents = req.body.events;
    } else if (req.body.eventType) {
      // Map single events into an array
      rawEvents = [req.body];
    } else {
      throw new BadRequestError('Ingestion failed: Payload must be a single telemetry event or a batch array.');
    }

    // 3. Format and clean timestamps (defaulting to server-time if missing from the client request)
    const formattedEvents: TelemetryEventInput[] = rawEvents.map((evt: any) => ({
      eventType: evt.eventType,
      severity: evt.severity ?? 1,
      metadata: evt.metadata ?? {},
      occurredAt: evt.occurredAt ?? new Date().toISOString()
    }));

    // 4. Ingest and re-assess protection levels
    const session = await this.telemetryService.ingestTelemetryBatch(
      sessionToken,
      formattedEvents
    );

    res.status(200).json({
      success: true,
      message: 'Telemetry successfully ingested and evaluated.',
      data: {
        sessionId: session.id,
        riskScore: session.riskScore,
        protectionLvl: session.protectionLvl
      }
    });
  };
}
