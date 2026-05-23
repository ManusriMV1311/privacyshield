import { TelemetryEvent, EventType } from '../types';
import { ConfigManager } from '../config';

type EventCallback = (event: TelemetryEvent) => void;

export class EventBus {
  private static listeners: Map<EventType, EventCallback[]> = new Map();
  private static eventQueue: TelemetryEvent[] = [];
  private static flushInterval: any = null;

  public static subscribe(eventType: EventType, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  public static dispatch(eventType: EventType, severity: 1 | 2 | 3 | 4, metadata: Record<string, any> = {}): void {
    const config = ConfigManager.get();
    
    // Check feature flags before processing events
    if (eventType === 'screenshot_attempt' && !config.enableScreenshotDetection) return;
    if (eventType === 'window_blur' && !config.enableWindowBlurDetection) return;
    if ((eventType === 'tab_hidden' || eventType === 'rapid_focus_switch') && !config.enableVisibilityDetection) return;
    if (eventType === 'devtools_opened' && !config.enableDevToolsDetection) return;

    const event: TelemetryEvent = {
      id: crypto.randomUUID(),
      eventType,
      severity,
      occurredAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    console.debug(`[PrivacyShield EventBus] Dispatched: ${eventType}`, event);

    // Trigger local callbacks
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[PrivacyShield EventBus] Error in callback for ${eventType}`, err);
      }
    });

    // Enqueue event
    this.eventQueue.push(event);

    // Critical events trigger immediate flushing to the backend
    if (severity >= 3) {
      this.flushImmediately();
    }
  }

  public static startScheduler(): void {
    if (this.flushInterval) return;
    const config = ConfigManager.get();
    this.flushInterval = setInterval(() => {
      this.flushQueue();
    }, config.telemetryBatchIntervalMs);
  }

  public static stopScheduler(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private static async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendToBackground(eventsToFlush);
    } catch (err) {
      console.error('[PrivacyShield EventBus] Failed to flush events, putting back in queue', err);
      this.eventQueue = [...eventsToFlush, ...this.eventQueue];
    }
  }

  private static async flushImmediately(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendToBackground(eventsToFlush);
    } catch (err) {
      console.error('[PrivacyShield EventBus] Failed to flush critical events immediately', err);
      this.eventQueue = [...eventsToFlush, ...this.eventQueue];
    }
  }

  private static sendToBackground(events: TelemetryEvent[]): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'LOG_EVENTS',
          payload: { events }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && !response.success) {
            reject(new Error(response.error || 'Unknown background processing error'));
          } else {
            resolve(response?.data);
          }
        }
      );
    });
  }
}
