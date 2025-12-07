/**
 * Viewport Detector for Foldable Phones
 * 
 * Detects viewport dimensions and applies appropriate CSS classes
 * to handle responsive layouts when CSS media queries fail.
 * 
 * Supports:
 * - Honor Magic V2/V3/V5 (folded: ~374x832, unfolded: ~1040x1000)
 * - Samsung Galaxy Z Fold 3/4/5 (folded: ~374x841, unfolded: ~1812x2176)
 * - Oppo Find N2/N3 (folded: ~402x888, unfolded: ~1792x1920)
 */

export type DeviceMode = 'phone-small' | 'phone-medium' | 'phone-large' | 'foldable-folded' | 'foldable-unfolded' | 'tablet' | 'desktop';

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  mode: DeviceMode;
  isFoldable: boolean;
  isPortrait: boolean;
  aspectRatio: number;
}

class ViewportDetector {
  private currentMode: DeviceMode = 'phone-medium';
  private listeners: Set<(info: ViewportInfo) => void> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private debounceTimer: number | null = null;
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    // Initial detection
    this.detectAndApply();
    
    // Listen for resize events
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      // Delay to allow browser to update dimensions
      setTimeout(() => this.detectAndApply(), 100);
    });
    
    // Use ResizeObserver for more accurate detection
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(document.documentElement);
    }
    
    // Listen for visual viewport changes (handles browser chrome)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.handleResize();
      });
    }
  }
  
  private handleResize(): void {
    // Debounce resize events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.detectAndApply();
    }, 50);
  }
  
  /**
   * Get current viewport information
   */
  getViewportInfo(): ViewportInfo {
    // Use visualViewport if available (more accurate on mobile)
    const vv = window.visualViewport;
    const width = vv ? vv.width : window.innerWidth;
    const height = vv ? vv.height : window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    const aspectRatio = width / height;
    const isPortrait = height > width;
    
    const mode = this.detectMode(width, height, aspectRatio);
    const isFoldable = mode === 'foldable-folded' || mode === 'foldable-unfolded';
    
    return {
      width,
      height,
      devicePixelRatio,
      mode,
      isFoldable,
      isPortrait,
      aspectRatio,
    };
  }
  
  /**
   * Detect device mode based on dimensions
   */
  private detectMode(width: number, height: number, aspectRatio: number): DeviceMode {
    // Desktop
    if (width >= 1200) {
      return 'desktop';
    }
    
    // Tablet
    if (width >= 768 && width < 1200 && aspectRatio > 0.6) {
      // Check if it's a foldable unfolded (close to square)
      if (aspectRatio >= 0.75 && aspectRatio <= 1.33 && width >= 900) {
        return 'foldable-unfolded';
      }
      return 'tablet';
    }
    
    // Foldable detection
    // Honor Magic V3 folded: ~374x832 (aspect ~0.45)
    // Samsung Z Fold folded: ~374x841 (aspect ~0.44)
    // Oppo Find N folded: ~402x888 (aspect ~0.45)
    if (width >= 370 && width <= 420 && height >= 800 && aspectRatio < 0.55) {
      return 'foldable-folded';
    }
    
    // Foldable unfolded (square-ish screens)
    // Honor Magic V3 unfolded: ~1040x1000 (aspect ~1.04)
    // Samsung Z Fold unfolded: ~1812x2176 (aspect ~0.83)
    if (aspectRatio >= 0.75 && aspectRatio <= 1.33 && width >= 600) {
      return 'foldable-unfolded';
    }
    
    // Phone sizes
    if (width <= 320) {
      return 'phone-small';
    }
    
    if (width <= 375) {
      return 'phone-medium';
    }
    
    return 'phone-large';
  }
  
  /**
   * Detect and apply CSS classes
   */
  detectAndApply(): void {
    const info = this.getViewportInfo();
    const newMode = info.mode;
    
    // Remove all mode classes
    const modeClasses = [
      'viewport-phone-small',
      'viewport-phone-medium',
      'viewport-phone-large',
      'viewport-foldable-folded',
      'viewport-foldable-unfolded',
      'viewport-tablet',
      'viewport-desktop',
      'viewport-portrait',
      'viewport-landscape',
      'viewport-foldable',
    ];
    
    document.documentElement.classList.remove(...modeClasses);
    document.body.classList.remove(...modeClasses);
    
    // Add current mode class
    const modeClass = `viewport-${newMode}`;
    document.documentElement.classList.add(modeClass);
    document.body.classList.add(modeClass);
    
    // Add orientation class
    const orientationClass = info.isPortrait ? 'viewport-portrait' : 'viewport-landscape';
    document.documentElement.classList.add(orientationClass);
    document.body.classList.add(orientationClass);
    
    // Add foldable class if applicable
    if (info.isFoldable) {
      document.documentElement.classList.add('viewport-foldable');
      document.body.classList.add('viewport-foldable');
    }
    
    // Set CSS custom properties for dimensions
    document.documentElement.style.setProperty('--viewport-width', `${info.width}px`);
    document.documentElement.style.setProperty('--viewport-height', `${info.height}px`);
    document.documentElement.style.setProperty('--viewport-ratio', info.aspectRatio.toFixed(2));
    
    // Calculate optimal board size
    const boardSize = this.calculateOptimalBoardSize(info);
    document.documentElement.style.setProperty('--optimal-board-size', `${boardSize}px`);
    
    // Notify listeners if mode changed
    if (newMode !== this.currentMode) {
      console.log(`Viewport mode changed: ${this.currentMode} -> ${newMode}`, info);
      this.currentMode = newMode;
    }
    
    // Always notify listeners
    this.listeners.forEach(listener => listener(info));
  }
  
  /**
   * Calculate optimal board size based on viewport
   */
  private calculateOptimalBoardSize(info: ViewportInfo): number {
    const { width, height, mode } = info;
    
    // Reserve space for UI elements
    let reservedHeight = 200; // Default for player cards, buttons, etc.
    
    switch (mode) {
      case 'phone-small':
        reservedHeight = 180;
        break;
      case 'phone-medium':
        reservedHeight = 200;
        break;
      case 'phone-large':
        reservedHeight = 220;
        break;
      case 'foldable-folded':
        reservedHeight = 240; // More space needed for buttons
        break;
      case 'foldable-unfolded':
        reservedHeight = 280;
        break;
      case 'tablet':
        reservedHeight = 300;
        break;
      case 'desktop':
        reservedHeight = 100;
        break;
    }
    
    // Calculate available space
    const availableWidth = width - 16; // 8px padding on each side
    const availableHeight = height - reservedHeight;
    
    // Board should be square, use the smaller dimension
    let boardSize = Math.min(availableWidth, availableHeight);
    
    // Apply max limits based on mode
    const maxSizes: Record<DeviceMode, number> = {
      'phone-small': 310,
      'phone-medium': 360,
      'phone-large': 400,
      'foldable-folded': 340,
      'foldable-unfolded': 580,
      'tablet': 550,
      'desktop': 600,
    };
    
    boardSize = Math.min(boardSize, maxSizes[mode]);
    
    // Ensure minimum size
    boardSize = Math.max(boardSize, 280);
    
    return Math.floor(boardSize);
  }
  
  /**
   * Subscribe to viewport changes
   */
  subscribe(listener: (info: ViewportInfo) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current info
    listener(this.getViewportInfo());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Get current mode
   */
  getMode(): DeviceMode {
    return this.currentMode;
  }
  
  /**
   * Check if device is a foldable
   */
  isFoldable(): boolean {
    return this.currentMode === 'foldable-folded' || this.currentMode === 'foldable-unfolded';
  }
  
  /**
   * Check if foldable is in folded mode
   */
  isFolded(): boolean {
    return this.currentMode === 'foldable-folded';
  }
  
  /**
   * Destroy the detector
   */
  destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.listeners.clear();
  }
}

// Singleton instance
let instance: ViewportDetector | null = null;

export function getViewportDetector(): ViewportDetector {
  if (!instance) {
    instance = new ViewportDetector();
  }
  return instance;
}

export function initViewportDetector(): ViewportDetector {
  return getViewportDetector();
}

export default ViewportDetector;