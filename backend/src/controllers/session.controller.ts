import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';

export class SessionController {
  private sessionService = new SessionService();

  start = async (req: Request, res: Response): Promise<void> => {
    const { extensionVersion, deviceMetadata } = req.body;
    const userAgent = req.headers['user-agent'] || 'unknown_device';

    const result = await this.sessionService.startSession(
      extensionVersion,
      deviceMetadata,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'PrivacyShield client session successfully established.',
      session: {
        id: result.session.id,
        sessionToken: result.session.sessionToken,
        riskScore: result.session.riskScore,
        protectionLvl: result.session.protectionLvl
      },
      watermark: {
        userHash: result.watermark.userHash,
        sessionToken: result.session.sessionToken,
        opacity: 0.08,
        rotationAngle: -25,
        fontSize: 13,
        fontFamily: 'monospace',
        density: 'medium',
        pulseSpeed: 0
      }
    });
  };

  end = async (req: Request, res: Response): Promise<void> => {
    const { sessionToken } = req.body;
    await this.sessionService.endSession(sessionToken);

    res.status(200).json({
      success: true,
      message: 'PrivacyShield client session successfully terminated.'
    });
  };

  getState = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const session = await this.sessionService.getSessionState(id);

    res.status(200).json({
      success: true,
      data: session
    });
  };
}
