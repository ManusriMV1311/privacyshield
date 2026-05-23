import { EventBus } from './event-bus';
import { Logger } from '../utils/logger';

export class DOMMonitor {
  private documentObserver: MutationObserver | null = null;
  private watchedElements: Map<string, { element: HTMLElement; style: string; parent: HTMLElement }> = new Map();
  private isHealing = false;
  private onTamperingDetected: () => void;

  constructor(onTamperingDetected: () => void) {
    this.onTamperingDetected = onTamperingDetected;
  }

  public register(id: string, element: HTMLElement, parent: HTMLElement = document.documentElement): void {
    this.watchedElements.set(id, {
      element,
      style: element.style.cssText,
      parent
    });
  }

  public startMonitoring(): void {
    if (this.documentObserver) return;

    this.documentObserver = new MutationObserver((mutations) => {
      if (this.isHealing) return;

      mutations.forEach((mutation) => {
        // Track visual node removal
        mutation.removedNodes.forEach((node) => {
          this.watchedElements.forEach((val, id) => {
            if (node === val.element) {
              this.handleTampering(id, 'removal');
            }
          });
        });

        // Track attribute style mutations attempting to hide overlays
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          this.watchedElements.forEach((val, id) => {
            if (target === val.element) {
              const currentStyle = target.getAttribute('style') || '';
              
              // Validate visual properties are intact
              const hasHiddenAttributes = 
                currentStyle.includes('display: none') || 
                currentStyle.includes('opacity: 0') || 
                currentStyle.includes('visibility: hidden');

              if (hasHiddenAttributes) {
                this.handleTampering(id, 'styling_tamper');
              }
            }
          });
        }
      });
    });

    this.documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    Logger.debug('DOMMonitor', 'Self-healing DOM monitor started.');
  }

  public stopMonitoring(): void {
    if (this.documentObserver) {
      this.documentObserver.disconnect();
      this.documentObserver = null;
    }
    this.watchedElements.clear();
    Logger.debug('DOMMonitor', 'Self-healing DOM monitor stopped.');
  }

  private handleTampering(id: string, tamperType: 'removal' | 'styling_tamper'): void {
    Logger.warn('DOMMonitor', `Tampering detected on overlay element: ${id} (${tamperType})`);
    
    // Log the anomaly as high-severity tampering alert
    EventBus.dispatch('tampering_detected', 4, { id, tamperType });

    // Call callback to enforce emergency blurs
    this.onTamperingDetected();

    // Trigger self-healing sequence
    this.heal(id);
  }

  private heal(id: string): void {
    const val = this.watchedElements.get(id);
    if (!val) return;

    this.isHealing = true;

    try {
      const { element, style, parent } = val;

      if (!document.documentElement.contains(element)) {
        Logger.debug('DOMMonitor', `Re-injecting deleted overlay: ${id}`);
        parent.appendChild(element);
      }

      // Re-apply core baseline overlay stylesheet rules
      element.style.cssText = style;
      element.removeAttribute('hidden');
    } catch (err) {
      Logger.error('DOMMonitor', `Healing process failed for ${id}:`, err);
    } finally {
      // Release self-healing lock state
      setTimeout(() => {
        this.isHealing = false;
      }, 50);
    }
  }
}
