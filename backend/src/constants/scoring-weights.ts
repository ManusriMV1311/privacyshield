import { TelemetryType } from '@prisma/client';

export const THREAT_WEIGHTS: Record<TelemetryType, number> = {
  [TelemetryType.TAMPERING_DETECTED]: 40,
  [TelemetryType.SCREENSHOT_ATTEMPT]: 25,
  [TelemetryType.RAPID_FOCUS_SWITCH]: 15,
  [TelemetryType.WINDOW_BLUR]: 5,
  [TelemetryType.TAB_HIDDEN]: 3,
  [TelemetryType.MEDIA_DETECTED]: 0,
  [TelemetryType.OVERLAY_ACTIVATED]: 0
};

export const RISK_LEVELS = {
  LEVEL_4_PERSISTENT_BLUR: 80,
  LEVEL_3_HIGH_THREAT: 50,
  LEVEL_2_ELEVATED: 20,
  LEVEL_1_SAFE: 0
};
