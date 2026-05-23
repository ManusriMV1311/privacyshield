import { BlurConfig } from '../types';
import { ConfigManager } from '../config';
import { ShadowHostManager } from './shadow-host';
import { Logger } from '../utils/logger';

export class BlurProtectionEngine {
  private hostManager: ShadowHostManager;
  private shadowRoot: ShadowRoot | null = null;
  private blurOverlay: HTMLDivElement | null = null;
  private messageBox: HTMLDivElement | null = null;
  private activeConfig: BlurConfig;
  private activeTarget: HTMLElement = document.body;
  private isCurrentlyBlurred = false;

  constructor() {
    this.hostManager = new ShadowHostManager('privacyshield-blur-overlay-host');
    this.activeConfig = { ...ConfigManager.get().blur };
  }

  public initialize(targetContainer: HTMLElement = document.documentElement): void {
    if (this.hostManager.getHostElement()) return;

    // Instantiate isolated closed Shadow DOM container
    this.shadowRoot = this.hostManager.initialize(targetContainer);

    // Design layout wrapper structures
    this.blurOverlay = document.createElement('div');
    this.blurOverlay.style.cssText = `
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      background-color: rgba(15, 23, 42, 0); /* Slate 900 transparent start */
      backdrop-filter: blur(0px);
      transition: background-color ${this.activeConfig.transitionSpeedMs}ms ease, backdrop-filter ${this.activeConfig.transitionSpeedMs}ms ease;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    `;

    // Create visual message container informing users of actions
    this.messageBox = document.createElement('div');
    this.messageBox.innerText = this.activeConfig.lockoutMessage;
    this.messageBox.style.cssText = `
      padding: 16px 24px;
      background-color: rgb(30, 41, 59); /* Slate 800 */
      color: rgb(248, 250, 252); /* Slate 50 */
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid rgb(71, 85, 105); /* Slate 600 */
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity ${this.activeConfig.transitionSpeedMs}ms ease, transform ${this.activeConfig.transitionSpeedMs}ms ease;
      pointer-events: none;
    `;

    this.blurOverlay.appendChild(this.messageBox);
    this.shadowRoot.appendChild(this.blurOverlay);

    Logger.debug('BlurProtectionEngine', 'Blur protection engine initialized inside isolated Shadow DOM.');
  }

  public getHostElement(): HTMLDivElement | null {
    return this.hostManager.getHostElement();
  }

  public setTargetContent(target: HTMLElement): void {
    this.activeTarget = target;
  }

  public activateBlur(durationMs?: number): void {
    if (this.isCurrentlyBlurred) return;
    this.isCurrentlyBlurred = true;

    if (!this.blurOverlay || !this.messageBox) return;

    // Apply Gaussian blur filter directly on target content layer
    this.activeTarget.style.transition = `filter ${this.activeConfig.transitionSpeedMs}ms ease`;
    this.activeTarget.style.filter = `blur(${this.activeConfig.blurRadius}px)`;

    // Make isolated backdrop lock display visible
    this.blurOverlay.style.pointerEvents = 'auto';
    this.blurOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
    this.blurOverlay.style.backdropFilter = 'blur(4px)';

    this.messageBox.style.opacity = '1';
    this.messageBox.style.transform = 'translateY(0)';

    Logger.debug('BlurProtectionEngine', `Visual shield activated. Blur duration limit: ${durationMs || 'permanent'}`);

    // Handle auto-release durations
    if (durationMs && durationMs > 0) {
      setTimeout(() => {
        this.deactivateBlur();
      }, durationMs);
    }
  }

  public deactivateBlur(): void {
    if (!this.isCurrentlyBlurred) return;
    this.isCurrentlyBlurred = false;

    if (!this.blurOverlay || !this.messageBox) return;

    // Un-blur content rendering canvas layers
    this.activeTarget.style.filter = 'none';

    // Remove lockout background overlays
    this.blurOverlay.style.pointerEvents = 'none';
    this.blurOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0)';
    this.blurOverlay.style.backdropFilter = 'blur(0px)';

    this.messageBox.style.opacity = '0';
    this.messageBox.style.transform = 'translateY(10px)';

    Logger.debug('BlurProtectionEngine', 'Visual shield deactivated.');
  }

  public isBlurred(): boolean {
    return this.isCurrentlyBlurred;
  }

  public destroy(): void {
    this.deactivateBlur();
    this.hostManager.destroy();
    this.shadowRoot = null;
    this.blurOverlay = null;
    this.messageBox = null;
    Logger.debug('BlurProtectionEngine', 'Blur protection resources cleanly destroyed.');
  }
}
