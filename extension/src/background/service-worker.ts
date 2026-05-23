import { SessionState, TelemetryEvent, ProtectionLevel } from '../types';
import { DEFAULT_CONFIG } from '../config';
import { Logger } from '../utils/logger';

class BackgroundServiceWorker {
  private sessionState: SessionState;
  private backendUrl: string;
  private localKey = 'privacyshield_session_cache';

  constructor() {
    this.backendUrl = DEFAULT_CONFIG.backendUrl;
    this.sessionState = {
      active: false,
      riskScore: 0,
      currentLevel: 1
    };
  }

  public initialize(): void {
    Logger.info('ServiceWorker', 'Initializing background service worker...');

    // 1. Listen for extension installations or updates
    chrome.runtime.onInstalled.addListener(() => {
      this.onInstalled();
    });

    // 2. Setup message passing router channels
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleIncomingMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async handlers
    });

    // 3. Hydrate state cache on launch
    this.loadStateFromCache();
  }

  private onInstalled(): void {
    Logger.info('ServiceWorker', 'Extension installed successfully.');
    // Provision default configurations
    chrome.storage.local.set({ privacyshield_config: DEFAULT_CONFIG });
  }

  private async loadStateFromCache(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.localKey], (result) => {
        if (result[this.localKey]) {
          this.sessionState = result[this.localKey] as SessionState;
          Logger.debug('ServiceWorker', 'Session state cache successfully hydrated.', this.sessionState);
        } else {
          // Initialize a mock default session to test the extension stand-alone
          this.initializeMockSession();
        }
        resolve();
      });
    });
  }

  private initializeMockSession(): void {
    const mockHash = 'sha256_mock_hash_' + Math.random().toString(36).substring(2, 9);
    const mockSessionToken = 'session_tkn_' + crypto.randomUUID();
    
    this.sessionState = {
      active: true,
      sessionId: crypto.randomUUID(),
      sessionToken: mockSessionToken,
      riskScore: 0,
      currentLevel: 1,
      watermark: {
        userHash: mockHash,
        sessionToken: mockSessionToken,
        opacity: 0.08,
        rotationAngle: -25,
        fontSize: 13,
        fontFamily: 'monospace',
        density: 'medium',
        pulseSpeed: 0
      }
    };
    
    Logger.info('ServiceWorker', `Created fresh standalone mock session: ${this.sessionState.sessionId}`);
    this.saveStateToCache();
  }

  private saveStateToCache(): void {
    chrome.storage.local.set({ [this.localKey]: this.sessionState });
  }

  private handleIncomingMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): void {
    const type = message.type;
    Logger.debug('ServiceWorker', `Received message: ${type}`, message);

    switch (type) {
      case 'GET_SESSION_STATE':
        sendResponse({ success: true, data: this.sessionState });
        break;

      case 'LOG_EVENTS':
        this.handleLogEvents(message.payload.events)
          .then(data => sendResponse({ success: true, data }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        break;

      case 'START_SESSION':
        this.handleStartSession(message.payload)
          .then(data => sendResponse({ success: true, data }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        break;

      case 'END_SESSION':
        this.handleEndSession()
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        break;

      default:
        sendResponse({ success: false, error: `Unhandled message type: ${type}` });
    }
  }

  private async handleLogEvents(events: TelemetryEvent[]): Promise<any> {
    Logger.info('ServiceWorker', 'Processing telemetry events batch:', events);

    // 1. Process scoring changes locally first
    events.forEach(evt => {
      this.evaluateEventScoring(evt);
    });

    // 2. Synchronize changes back to all active tabs
    this.broadcastSessionState();

    // 3. Save states inside storage
    this.saveStateToCache();

    // 4. Asynchronously send logs to backend API
    try {
      await this.postTelemetryToBackend(events);
    } catch (err) {
      Logger.warn('ServiceWorker', 'Backend synchronization failed, telemetry cached locally.', err);
    }

    return {
      riskScore: this.sessionState.riskScore,
      currentLevel: this.sessionState.currentLevel
    };
  }

  private evaluateEventScoring(event: TelemetryEvent): void {
    let weight = 0;

    switch (event.eventType) {
      case 'screenshot_attempt':
        weight = 25;
        Logger.warn('ServiceWorker', 'Telemetry screenshot_attempt detected.');
        break;
      case 'window_blur':
        weight = 5;
        break;
      case 'rapid_focus_switch':
        weight = 15;
        Logger.warn('ServiceWorker', 'Telemetry rapid_focus_switch detected.');
        break;
      case 'tampering_detected':
        weight = 40;
        Logger.error('ServiceWorker', 'Telemetry tampering_detected Alert!');
        break;
      case 'tab_hidden':
        weight = 3;
        break;
      case 'media_detected':
      default:
        weight = 0;
        break;
    }

    // Accumulate risk scoring
    this.sessionState.riskScore = Math.min(100, this.sessionState.riskScore + weight);

    // Recalculate escalation levels
    const prevLevel = this.sessionState.currentLevel;
    let nextLevel: ProtectionLevel = 1;

    if (this.sessionState.riskScore >= 80) {
      nextLevel = 4; // Locked suspended state
    } else if (this.sessionState.riskScore >= 50) {
      nextLevel = 3; // Permanent content blur
    } else if (this.sessionState.riskScore >= 20) {
      nextLevel = 2; // Elevated pulsing watermarks
    } else {
      nextLevel = 1; // Baseline
    }

    this.sessionState.currentLevel = nextLevel;

    if (prevLevel !== nextLevel) {
      Logger.info('ServiceWorker', `Protection level shifted: Level ${prevLevel} -> Level ${nextLevel}`);
    }
  }

  private async postTelemetryToBackend(events: TelemetryEvent[]): Promise<void> {
    const url = `${this.backendUrl}/events/capture`;

    const responses = events.map(async (event) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionState.sessionToken}`
        },
        body: JSON.stringify({
          sessionId: this.sessionState.sessionId,
          eventType: event.eventType,
          severity: event.severity,
          metadata: event.metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      return response.json();
    });

    await Promise.all(responses);
  }

  private async handleStartSession(payload: { deviceFp: string; ipAddress: string }): Promise<SessionState> {
    const url = `${this.backendUrl}/sessions/start`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('API server returned error during session creation');
      }

      const resData = await response.json();
      
      this.sessionState = {
        active: true,
        sessionId: resData.session.id,
        sessionToken: resData.session.sessionToken,
        riskScore: resData.session.riskScore,
        currentLevel: resData.session.protectionLvl as ProtectionLevel,
        watermark: {
          userHash: resData.watermark.userHash,
          sessionToken: resData.session.sessionToken,
          opacity: 0.08,
          rotationAngle: -25,
          fontSize: 13,
          fontFamily: 'monospace',
          density: 'medium',
          pulseSpeed: 0
        }
      };

      this.saveStateToCache();
      this.broadcastSessionState();
      
      return this.sessionState;
    } catch (err) {
      Logger.warn('ServiceWorker', 'StartSession API call failed. Keeping local mock state.', err);
      this.initializeMockSession();
      return this.sessionState;
    }
  }

  private async handleEndSession(): Promise<void> {
    const url = `${this.backendUrl}/sessions/end`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionState.sessionToken}`
        },
        body: JSON.stringify({ sessionId: this.sessionState.sessionId })
      });
    } catch (err) {
      Logger.warn('ServiceWorker', 'EndSession API network sync skipped.', err);
    } finally {
      // Clear state and rebuild a mock baseline state
      this.initializeMockSession();
    }
  }

  private broadcastSessionState(): void {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            {
              type: 'SESSION_STATE_UPDATED',
              payload: this.sessionState
            },
            () => {
              // Ignore runtime errors indicating inactive script tabs
              const err = chrome.runtime.lastError;
              if (err) {
                Logger.debug('ServiceWorker', `Skip broadcasting to inactive tab: ${tab.id}`);
              }
            }
          );
        }
      });
    });
  }
}

const serviceWorker = new BackgroundServiceWorker();
serviceWorker.initialize();
