export type ProtectionLevel = 1 | 2 | 3 | 4;

export interface WatermarkConfig {
  userHash: string;
  sessionToken: string;
  opacity: number;
  rotationAngle: number; // in degrees
  fontSize: number;
  fontFamily: string;
  density: 'low' | 'medium' | 'high';
  pulseSpeed: number; // 0 for static
}

export interface BlurConfig {
  blurRadius: number; // in pixels
  transitionSpeedMs: number;
  lockoutMessage: string;
}

export interface ExtensionConfig {
  backendUrl: string;
  enableScreenshotDetection: boolean;
  enableVisibilityDetection: boolean;
  enableWindowBlurDetection: boolean;
  enableDevToolsDetection: boolean;
  telemetryBatchIntervalMs: number;
  baselineWatermark: WatermarkConfig;
  blur: BlurConfig;
}

export type EventType =
  | 'media_detected'
  | 'overlay_activated'
  | 'screenshot_attempt'
  | 'window_blur'
  | 'tab_hidden'
  | 'rapid_focus_switch'
  | 'devtools_opened'
  | 'tampering_detected';

export interface TelemetryEvent {
  id: string;
  eventType: EventType;
  severity: 1 | 2 | 3 | 4;
  occurredAt: string;
  metadata: Record<string, any>;
}

export interface SessionState {
  active: boolean;
  sessionId?: string;
  sessionToken?: string;
  riskScore: number;
  currentLevel: ProtectionLevel;
  watermark?: WatermarkConfig;
}

export interface MessagePayload<T = any> {
  type: string;
  payload?: T;
}

export interface MessageResponse<R = any> {
  success: boolean;
  data?: R;
  error?: string;
}
