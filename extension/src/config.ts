import { ExtensionConfig } from './types';

export const DEFAULT_CONFIG: ExtensionConfig = {
  backendUrl: 'http://localhost:5000/api/v1',
  enableScreenshotDetection: true,
  enableVisibilityDetection: true,
  enableWindowBlurDetection: true,
  enableDevToolsDetection: true,
  telemetryBatchIntervalMs: 10000, // Batch and send every 10s
  baselineWatermark: {
    userHash: 'anonymous_user_hash',
    sessionToken: 'uninitialized_session',
    opacity: 0.08,
    rotationAngle: -25,
    fontSize: 13,
    fontFamily: 'monospace',
    density: 'medium',
    pulseSpeed: 0
  },
  blur: {
    blurRadius: 15,
    transitionSpeedMs: 150,
    lockoutMessage: '🔒 Protected Surface View Lockout. Unfocus detected or capture key clicked.'
  }
};

export class ConfigManager {
  private static activeConfig: ExtensionConfig = { ...DEFAULT_CONFIG };

  public static get(): ExtensionConfig {
    return this.activeConfig;
  }

  public static update(newConfig: Partial<ExtensionConfig>): void {
    this.activeConfig = {
      ...this.activeConfig,
      ...newConfig,
      baselineWatermark: {
        ...this.activeConfig.baselineWatermark,
        ...(newConfig.baselineWatermark || {})
      },
      blur: {
        ...this.activeConfig.blur,
        ...(newConfig.blur || {})
      }
    };
  }

  public static async loadFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['privacyshield_config'], (result) => {
        if (result.privacyshield_config) {
          this.update(result.privacyshield_config);
        }
        resolve();
      });
    });
  }

  public static async saveToStorage(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ privacyshield_config: this.activeConfig }, () => {
        resolve();
      });
    });
  }
}
