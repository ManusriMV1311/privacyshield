import { EventBus } from './event-bus';
import { Logger } from '../utils/logger';

export class MediaDetector {
  private documentObserver: MutationObserver | null = null;
  private detectedElements: WeakSet<HTMLElement> = new WeakSet();
  private elementOverlays: WeakMap<HTMLElement, string> = new WeakMap();
  private minImageSize = 64; // Ignore micro-assets, utility icons, or UI layouts
  private scanQueue: Set<HTMLElement> = new Set();
  private isScanScheduled = false;

  public startScanning(): void {
    // Scan initially present static elements
    this.scanStaticDOM();

    // Start mutation monitoring to catch dynamically loaded media
    this.documentObserver = new MutationObserver((mutations) => {
      let nodesQueued = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.scanQueue.add(node);
            nodesQueued = true;
          }
        });
      });

      if (nodesQueued) {
        this.scheduleScan();
      }
    });

    this.documentObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    Logger.debug('MediaDetector', 'Media observer started scanning DOM mutations.');
  }

  private scheduleScan(): void {
    if (this.isScanScheduled) return;
    this.isScanScheduled = true;

    // Use requestIdleCallback with fallbacks to requestAnimationFrame or setTimeout
    const defer = (window as any).requestIdleCallback || window.requestAnimationFrame || ((cb: any) => setTimeout(cb, 50));

    defer(() => {
      this.processScanQueue();
      this.isScanScheduled = false;
    });
  }

  private processScanQueue(): void {
    if (this.scanQueue.size === 0) return;

    const roots = Array.from(this.scanQueue);
    this.scanQueue.clear();

    Logger.debug('MediaDetector', `Batch-processing ${roots.length} dynamic mutation nodes under idle frame...`);

    roots.forEach((rootNode) => {
      // Avoid scanning if element was removed from the DOM before we processed it
      if (!document.documentElement.contains(rootNode)) return;

      this.inspectAndRegister(rootNode);

      // Deep scan nested children in a single traversal
      const nestedImages = rootNode.querySelectorAll('img');
      const nestedVideos = rootNode.querySelectorAll('video');
      const nestedCanvases = rootNode.querySelectorAll('canvas');

      nestedImages.forEach(el => this.inspectAndRegister(el as HTMLElement));
      nestedVideos.forEach(el => this.inspectAndRegister(el as HTMLElement));
      nestedCanvases.forEach(el => this.inspectAndRegister(el as HTMLElement));
    });
  }

  public stopScanning(): void {
    if (this.documentObserver) {
      this.documentObserver.disconnect();
      this.documentObserver = null;
    }
    this.scanQueue.clear();
    // Clearing WeakSet and WeakMap is done implicitly by releasing references to avoid memory leaks
    this.detectedElements = new WeakSet();
    this.elementOverlays = new WeakMap();
    Logger.debug('MediaDetector', 'Media detector successfully stopped and cleared.');
  }

  private scanStaticDOM(): void {
    Logger.debug('MediaDetector', 'Performing baseline static DOM scan...');
    const images = document.querySelectorAll('img');
    const videos = document.querySelectorAll('video');
    const canvases = document.querySelectorAll('canvas');

    images.forEach(el => this.inspectAndRegister(el as HTMLElement));
    videos.forEach(el => this.inspectAndRegister(el as HTMLElement));
    canvases.forEach(el => this.inspectAndRegister(el as HTMLElement));
  }

  private inspectAndRegister(element: HTMLElement): void {
    // Memory-safe WeakSet check
    if (this.detectedElements.has(element)) return;

    const tagName = element.tagName.toLowerCase();

    if (tagName === 'img') {
      const img = element as HTMLImageElement;

      const inspect = () => {
        if (img.naturalWidth >= this.minImageSize && img.naturalHeight >= this.minImageSize) {
          this.register(img, 'image');
        }
      };

      if (img.complete) {
        inspect();
      } else {
        img.addEventListener('load', inspect, { once: true });
      }
    } else if (tagName === 'video') {
      this.register(element, 'video');
    } else if (tagName === 'canvas') {
      // Exclude PrivacyShield's own canvas elements from triggering warnings
      if (element.id !== 'privacyshield-watermark-canvas') {
        this.register(element, 'canvas');
      }
    }
  }

  private register(element: HTMLElement, mediaType: 'image' | 'video' | 'canvas'): void {
    this.detectedElements.add(element);

    // Track active overlay mappings in WeakMap (for future frame isolation updates)
    this.elementOverlays.set(element, `overlay-registered-${crypto.randomUUID().substring(0, 8)}`);

    const elementDetails = {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      mediaType,
      src: (element as any).src || (element as any).currentSrc || 'dynamic-source'
    };

    Logger.info('MediaDetector', `Media node detected: ${mediaType} (${element.tagName} id: "${element.id}")`);
    EventBus.dispatch('media_detected', 1, elementDetails);
  }
}
