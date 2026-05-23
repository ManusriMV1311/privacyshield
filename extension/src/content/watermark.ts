import { WatermarkConfig } from '../types';
import { ConfigManager } from '../config';
import { ShadowHostManager } from './shadow-host';
import { Logger } from '../utils/logger';

export class WatermarkEngine {
  private hostManager: ShadowHostManager;
  private shadowRoot: ShadowRoot | null = null;
  private overlayContainer: HTMLDivElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private activeConfig: WatermarkConfig;
  private pulseInterval: any = null;

  constructor() {
    this.hostManager = new ShadowHostManager('privacyshield-watermark-overlay-host');
    this.activeConfig = { ...ConfigManager.get().baselineWatermark };
  }

  public initialize(targetContainer: HTMLElement = document.documentElement): void {
    if (this.hostManager.getHostElement()) return;

    // Instantiate isolated closed Shadow DOM container
    this.shadowRoot = this.hostManager.initialize(targetContainer);

    // Build the visual container within the Shadow root
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.style.cssText = `
      width: 100%;
      height: 100%;
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 0;
      mix-blend-mode: multiply;
      transition: opacity 0.3s ease;
    `;

    this.shadowRoot.appendChild(this.overlayContainer);

    // Apply baseline rendering config
    this.render();
    Logger.debug('WatermarkEngine', 'Watermark engine initialized inside isolated Shadow DOM.');
  }

  public getHostElement(): HTMLDivElement | null {
    return this.hostManager.getHostElement();
  }

  public updateConfig(newConfig: Partial<WatermarkConfig>): void {
    this.activeConfig = { ...this.activeConfig, ...newConfig };
    this.render();
  }

  public destroy(): void {
    this.stopPulsing();
    this.hostManager.destroy();
    this.shadowRoot = null;
    this.overlayContainer = null;
    this.canvasElement = null;
    Logger.debug('WatermarkEngine', 'Watermark engine resources cleanly destroyed.');
  }

  private render(): void {
    if (!this.overlayContainer) return;

    const dataUrl = this.generateWatermarkPattern();
    this.overlayContainer.style.backgroundImage = `url(${dataUrl})`;
    this.overlayContainer.style.backgroundRepeat = 'repeat';
    this.overlayContainer.style.opacity = `${this.activeConfig.opacity}`;

    if (this.activeConfig.pulseSpeed > 0) {
      this.startPulsing();
    } else {
      this.stopPulsing();
    }
  }

  private generateWatermarkPattern(): string {
    const { fontSize, fontFamily, rotationAngle, userHash, sessionToken } = this.activeConfig;

    // Create dynamic in-memory canvas grid element
    const canvas = this.canvasElement || document.createElement('canvas');
    this.canvasElement = canvas;

    const size = this.getGridSpacingSize();
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, size, size);

    // Dynamic grid spacing drawing settings
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotationAngle * Math.PI) / 180);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.9)'; // Tailwind slate-500 equivalent color
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Print dual watermark tags for forensic tracking
    ctx.fillText(userHash, 0, -fontSize / 2 - 2);
    ctx.font = `${fontSize - 2}px ${fontFamily}`;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'; // slate-400
    ctx.fillText(`ID: ${sessionToken.substring(0, 8)}...`, 0, fontSize / 2 + 2);

    ctx.restore();

    return canvas.toDataURL();
  }

  private getGridSpacingSize(): number {
    switch (this.activeConfig.density) {
      case 'low': return 400;
      case 'high': return 180;
      case 'medium':
      default: return 260;
    }
  }

  private startPulsing(): void {
    this.stopPulsing();
    if (!this.overlayContainer) return;

    let ascending = false;
    const minOpacity = Math.max(0.02, this.activeConfig.opacity * 0.4);
    const maxOpacity = Math.min(0.25, this.activeConfig.opacity * 1.5);
    let currentOpacity = this.activeConfig.opacity;
    const step = 0.005;

    this.pulseInterval = setInterval(() => {
      if (!this.overlayContainer) return;

      if (ascending) {
        currentOpacity += step;
        if (currentOpacity >= maxOpacity) ascending = false;
      } else {
        currentOpacity -= step;
        if (currentOpacity <= minOpacity) ascending = true;
      }

      this.overlayContainer.style.opacity = `${currentOpacity}`;
    }, 1000 / (this.activeConfig.pulseSpeed * 60)); // Normalize frequency
  }

  private stopPulsing(): void {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    if (this.overlayContainer) {
      this.overlayContainer.style.opacity = `${this.activeConfig.opacity}`;
    }
  }
}
