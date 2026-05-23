import { Logger } from '../utils/logger';

export class ShadowHostManager {
  private hostElement: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private id: string;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Instantiates the shadow host and attaches a closed shadow root.
   */
  public initialize(
    targetContainer: HTMLElement = document.documentElement,
    hostStyles: string = ''
  ): ShadowRoot {
    if (this.hostElement) {
      Logger.warn('ShadowHost', `Host element with ID '${this.id}' already initialized.`);
      return this.shadowRoot!;
    }

    // 1. Create the host container element
    this.hostElement = document.createElement('div');
    this.hostElement.id = this.id;
    
    // Apply standard baseline styles if custom not provided
    this.hostElement.style.cssText = hostStyles || `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483645;
      display: block;
    `;

    // 2. Attach the closed shadow root
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    // 3. Mount onto host website DOM
    targetContainer.appendChild(this.hostElement);
    
    Logger.debug('ShadowHost', `Shadow host '${this.id}' initialized and mounted inside closed shadow root.`);
    return this.shadowRoot;
  }

  /**
   * Injects styled rules inside the isolated Shadow DOM context
   */
  public injectStyles(cssRules: string): void {
    if (!this.shadowRoot) {
      Logger.error('ShadowHost', `Cannot inject styles. Shadow host '${this.id}' is not initialized.`);
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.textContent = cssRules;
    this.shadowRoot.appendChild(styleElement);
  }

  /**
   * Get the underlying host element
   */
  public getHostElement(): HTMLDivElement | null {
    return this.hostElement;
  }

  /**
   * Cleanly destroys and unmounts the shadow host container
   */
  public destroy(): void {
    if (this.hostElement) {
      if (this.hostElement.parentNode) {
        this.hostElement.parentNode.removeChild(this.hostElement);
      }
      Logger.debug('ShadowHost', `Shadow host '${this.id}' successfully unmounted and destroyed.`);
      this.hostElement = null;
      this.shadowRoot = null;
    }
  }
}
