import { SessionRepository } from '../repositories/session.repository';
import { THREAT_WEIGHTS, RISK_LEVELS } from '../constants/scoring-weights';
import { TelemetryType, Session } from '@prisma/client';
import { logger } from '../utils/logger';

export class RiskScoringService {
  private sessionRepository = new SessionRepository();

  async processEventsAndAdjustRisk(
    sessionId: string,
    eventTypes: TelemetryType[]
  ): Promise<Session> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session with ID '${sessionId}' not found for risk evaluation.`);
    }

    // 1. Calculate cumulative threat weight changes
    let scoreDelta = 0;
    eventTypes.forEach((type) => {
      const weight = THREAT_WEIGHTS[type] ?? 0;
      scoreDelta += weight;
    });

    if (scoreDelta === 0) {
      return session; // No changes to process
    }

    const previousScore = session.riskScore;
    
    // 2. Accumulate score bounded strictly between 0 and 100
    const newScore = Math.min(100, Math.max(0, previousScore + scoreDelta));
    
    if (newScore === previousScore) {
      return session; // Bounded limit reached without adjustments
    }

    // 3. Map new scores to protection level thresholds
    let newProtectionLevel = 1;
    if (newScore >= RISK_LEVELS.LEVEL_4_PERSISTENT_BLUR) {
      newProtectionLevel = 4;
    } else if (newScore >= RISK_LEVELS.LEVEL_3_HIGH_THREAT) {
      newProtectionLevel = 3;
    } else if (newScore >= RISK_LEVELS.LEVEL_2_ELEVATED) {
      newProtectionLevel = 2;
    }

    const changeReason = `Ingested telemetry batch [${eventTypes.join(', ')}] shifted score by ${scoreDelta} pts.`;
    logger.info(
      `[RiskEngine] Session: ${sessionId} | Score: ${previousScore} -> ${newScore} | Level: ${session.protectionLvl} -> ${newProtectionLevel}`
    );

    // 4. Save history record and update session row
    await this.sessionRepository.addRiskScoreHistory(
      sessionId,
      previousScore,
      newScore,
      changeReason
    );

    return this.sessionRepository.update(sessionId, {
      riskScore: newScore,
      protectionLvl: newProtectionLevel
    });
  }
}
