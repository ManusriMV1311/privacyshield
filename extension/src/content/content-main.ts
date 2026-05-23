import { ConfigManager } from '../config';
import { EventBus } from './event-bus';
import { WatermarkEngine } from './watermark';
import { BlurProtectionEngine } from './blur-protection';
import { MediaDetector } from './media-detector';
import { DOMMonitor } from './dom-monitor';
import { SessionState } from '../types';
import { Logger } from '../utils/logger';

class PrivacyShieldClientAgent {
  private watermarkEngine: WatermarkEngine;
  private blurEngine: BlurProtectionEngine;
  private mediaDetector: MediaDetector;
  private domMonitor: DOMMonitor;
  private sessionState: SessionState;
  
  // Dynamic threat event telemetry tracking
  private tabSwitchTimestamps: number[] = [];
  private isDestroyed = false;

  // Stored listener references for clean teardown
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private beforeprintListener: ((e: Event) => void) | null = null;
  private blurListener: (() => void) | null = null;
  private focusListener: (() => void) | null = null;
  private visibilityListener: (() => void) | null = null;

  constructor() {
    this.watermarkEngine = new WatermarkEngine();
    this.blurEngine = new BlurProtectionEngine();
    this.mediaDetector = new MediaDetector();
    
    this.domMonitor = new DOMMonitor(() => {
      // Emergency callback triggers full safety blur during tampering
      if (this.isContextStillValid()) {
        this.blurEngine.activateBlur();
      }
    });

    this.sessionState = {
      active: false,
      riskScore: 0,
      currentLevel: 1
    };
  }

  public async bootstrap(): Promise<void> {
    Logger.info('ClientAgent', 'Starting Client Core Runtime bootstrap sequence...');

    try {
      // 1. Hydrate configurations from chrome storage
      await ConfigManager.loadFromStorage();

      // 2. Query Background service worker to request/validate active sessions
      await this.syncSessionState();

      // 3. Initialize visual overlays inside isolated shadow DOMs
      this.watermarkEngine.initialize();
      this.blurEngine.initialize();
      this.blurEngine.setTargetContent(document.body);

      // 4. Register overlays inside DOM self-healing monitors
      const wmHost = this.watermarkEngine.getHostElement();
      const blurHost = this.blurEngine.getHostElement();
      if (wmHost) this.domMonitor.register('watermark-overlay', wmHost);
      if (blurHost) this.domMonitor.register('blur-lockout-overlay', blurHost);

      // 5. Connect structural listeners & sensors
      this.domMonitor.startMonitoring();
      this.mediaDetector.startScanning();
      this.setupSecurityListeners();

      // 6. Connect dynamic state sync message channels
      this.listenBackgroundUpdates();

      // 7. Start Telemetry scheduler
      EventBus.startScheduler();

      EventBus.dispatch('overlay_activated', 1, {
        status: 'BOOTSTRAPPED',
        timestamp: new Date().toISOString()
      });

      Logger.info('ClientAgent', 'Client Core Runtime successfully bootstrapped.');
    } catch (err) {
      Logger.error('ClientAgent', 'Bootstrap process encountered failures:', err);
    }
  }

  private async syncSessionState(): Promise<void> {
    if (!this.isContextStillValid()) return;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
        // Trap background connection drops gracefully
        if (chrome.runtime.lastError) {
          Logger.warn('ClientAgent', 'Failed to communicate with service worker during bootstrap. Relying on local settings.', chrome.runtime.lastError.message);
          resolve();
          return;
        }

        if (response && response.success && response.data) {
          this.sessionState = response.data;
          
          if (this.sessionState.watermark) {
            this.watermarkEngine.updateConfig(this.sessionState.watermark);
          }
          
          this.evaluateEscalationLevel();
        }
        resolve();
      });
    });
  }

  private setupSecurityListeners(): void {
    const config = ConfigManager.get();

    // Remove any existing listeners first to prevent duplicates
    this.removeSecurityListeners();

    // Listener A: Keyboard shortcuts (Only Ctrl+P, no devtools or printscreen interception hooks)
    if (config.enableScreenshotDetection) {
      this.keydownListener = (e: KeyboardEvent) => {
        if (!this.isContextStillValid()) return;

        const isPrintCtrl = (e.ctrlKey || e.metaKey) && e.key === 'p';

        if (isPrintCtrl) {
          e.preventDefault();
          this.handleCaptureThreat('screenshot_attempt', { key: 'Ctrl+P' });
        }
      };

      this.beforeprintListener = (e: Event) => {
        if (!this.isContextStillValid()) return;
        e.preventDefault();
        this.handleCaptureThreat('screenshot_attempt', { source: 'beforeprint' });
      };

      window.addEventListener('keydown', this.keydownListener, { capture: true, passive: false });
      window.addEventListener('beforeprint', this.beforeprintListener, { passive: false });
      Logger.debug('ClientAgent', 'Keyboard and print listeners attached with { passive: false }.');
    }

    // Listener B: Document focus changes
    if (config.enableWindowBlurDetection) {
      this.blurListener = () => {
        if (!this.isContextStillValid()) return;
        this.blurEngine.activateBlur();
        EventBus.dispatch('window_blur', 2, { source: 'window_blur' });
      };

      this.focusListener = () => {
        if (!this.isContextStillValid()) return;
        if (this.sessionState.currentLevel < 3) {
          this.blurEngine.deactivateBlur();
        }
      };

      window.addEventListener('blur', this.blurListener);
      window.addEventListener('focus', this.focusListener);
      Logger.debug('ClientAgent', 'Focus and window blur event listeners attached.');
    }

    // Listener C: Tab Visibility changes
    if (config.enableVisibilityDetection) {
      this.visibilityListener = () => {
        if (!this.isContextStillValid()) return;
        if (document.hidden) {
          this.blurEngine.activateBlur();
          EventBus.dispatch('tab_hidden', 2, { source: 'visibilitychange' });
          this.trackTabSwitchVelocity();
        }
      };

      document.addEventListener('visibilitychange', this.visibilityListener);
      Logger.debug('ClientAgent', 'Tab visibilitychange listeners attached.');
    }
  }

  private removeSecurityListeners(): void {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener, { capture: true });
      this.keydownListener = null;
    }
    if (this.beforeprintListener) {
      window.removeEventListener('beforeprint', this.beforeprintListener);
      this.beforeprintListener = null;
    }
    if (this.blurListener) {
      window.removeEventListener('blur', this.blurListener);
      this.blurListener = null;
    }
    if (this.focusListener) {
      window.removeEventListener('focus', this.focusListener);
      this.focusListener = null;
    }
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }

  private handleCaptureThreat(type: 'screenshot_attempt', metadata: Record<string, any>): void {
    // Dispatch capture events immediately with high severity (3)
    EventBus.dispatch(type, 3, metadata);

    // Apply temporary blur overlay activation instantly
    this.blurEngine.activateBlur(6000); // 6s warning lock
  }

  private trackTabSwitchVelocity(): void {
    const now = Date.now();
    this.tabSwitchTimestamps = this.tabSwitchTimestamps.filter(ts => now - ts < 10000); // Limit to 10s window
    this.tabSwitchTimestamps.push(now);

    // If alternating active pages faster than 3 tab switches in 10s
    if (this.tabSwitchTimestamps.length >= 3) {
      EventBus.dispatch('rapid_focus_switch', 2, {
        switchCountIn10s: this.tabSwitchTimestamps.length
      });
      this.tabSwitchTimestamps = []; // Reset queue
    }
  }

  private listenBackgroundUpdates(): void {
    if (!this.isContextStillValid()) return;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // Safety check for context invalidation
      if (!this.isContextStillValid()) {
        sendResponse({ success: false, error: 'Context invalidated.' });
        return;
      }

      if (message.type === 'SESSION_STATE_UPDATED') {
        this.sessionState = message.payload;
        
        if (this.sessionState.watermark) {
          this.watermarkEngine.updateConfig(this.sessionState.watermark);
        }

        this.evaluateEscalationLevel();
        sendResponse({ success: true });
      }
    });
  }

  private evaluateEscalationLevel(): void {
    const level = this.sessionState.currentLevel;

    if (level >= 3) {
      // Escalate to high active threat states (permanent content blur until admin resets)
      this.blurEngine.activateBlur();
    } else if (level === 2) {
      // Dynamic adjustments: Pulsing watermark overlay styling changes
      this.blurEngine.deactivateBlur();
      this.watermarkEngine.updateConfig({
        opacity: 0.15,
        density: 'high',
        pulseSpeed: 1.5
      });
    } else {
      // Normalize baseline watermarks
      this.blurEngine.deactivateBlur();
      const defaultWM = ConfigManager.get().baselineWatermark;
      this.watermarkEngine.updateConfig(defaultWM);
    }
  }

  /**
   * Safe check to determine if the Chrome Extension's messaging context is active.
   * Traps invalidation errors and triggers a clean teardown if orphaned.
   */
  private isContextStillValid(): boolean {
    if (this.isDestroyed) return false;

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        return true;
      }
    } catch (err) {
      // runtime is undefined, id is missing, or access throws context invalidated
    }

    this.handleEmergencyCleanup();
    return false;
  }

  /**
   * Emergency Teardown: Destroys visual overlays and clears listeners,
   * avoiding visual blocking of user interface if extension updates or unloads.
   */
  private handleEmergencyCleanup(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    Logger.warn('ClientAgent', 'Extension context was invalidated or severed. Initiating emergency cleanup teardown...');

    try {
      // 1. Remove all document/window events
      this.removeSecurityListeners();

      // 2. Shut down background telemetry batch scheduler
      EventBus.stopScheduler();

      // 3. Stop MutationObservers
      this.domMonitor.stopMonitoring();
      this.mediaDetector.stopScanning();

      // 4. Destroy and purge overlays from viewports
      this.watermarkEngine.destroy();
      this.blurEngine.destroy();

      // 5. Release global injection lock
      delete (window as any).__privacyshield_agent_initialized__;

      Logger.info('ClientAgent', 'Emergency client runtime cleanup teardown completed.');
    } catch (err) {
      console.error('[PrivacyShield][ERROR][ClientAgent] Failed cleanly during emergency teardown:', err);
    }
  }
}

// Global bootstrap locking check to prevent duplicate injections on dynamic SPA sites
if ((window as any).__privacyshield_agent_initialized__) {
  Logger.warn('ClientAgent', 'Client Agent already active on this target window. Blocking duplicate bootstrap.');
} else {
  (window as any).__privacyshield_agent_initialized__ = true;
  
  const agent = new PrivacyShieldClientAgent();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => agent.bootstrap());
  } else {
    agent.bootstrap();
  }
}
