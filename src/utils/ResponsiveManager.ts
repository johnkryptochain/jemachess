/**
 * ULTIMATE RESPONSIVE MANAGER 2025
 * 
 * The most robust responsive solution using:
 * - Screen Orientation API
 * - Visual Viewport API
 * - ResizeObserver
 * - matchMedia listeners
 * - CSS Custom Properties injection
 * - Foldable Screen API (experimental)
 * 
 * This manager ensures responsive layouts work on ALL devices,
 * including foldable phones where CSS media queries often fail.
 */

export type DeviceType = 
  | 'phone-xs'      // < 320px (iPhone 4/5/SE 1st gen)
  | 'phone-sm'      // 320-374px (iPhone SE 2nd/3rd gen)
  | 'phone-md'      // 375-430px (iPhone 6-15, most Android)
  | 'phone-lg'      // 431-600px (iPhone Plus/Max, large Android)
  | 'foldable-folded'   // Foldable in folded mode
  | 'foldable-unfolded' // Foldable in unfolded mode
  | 'tablet'        // 601-1100px
  | 'desktop';      // > 1100px

export interface ResponsiveState {
  // Dimensions
  width: number;
  height: number;
  visualWidth: number;
  visualHeight: number;
  
  // Device info
  deviceType: DeviceType;
  devicePixelRatio: number;
  
  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;
  aspectRatio: number;
  
  // Foldable specific
  isFoldable: boolean;
  isFolded: boolean;
  
  // Computed values
  optimalBoardSize: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

type ResponsiveListener = (state: ResponsiveState) => void;

class ResponsiveManager {
  private state: ResponsiveState;
  private listeners: Set<ResponsiveListener> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueryLists: MediaQueryList[] = [];
  private rafId: number | null = null;
  private lastUpdate: number = 0;
  private updateThrottle: number = 16; // ~60fps
  
  constructor() {
    this.state = this.computeState();
    this.init();
  }
  
  private init(): void {
    // 1. Initial state computation and application
    this.applyState();
    
    // 2. Window resize listener
    window.addEventListener('resize', this.scheduleUpdate.bind(this), { passive: true });
    
    // 3. Orientation change listener
    window.addEventListener('orientationchange', () => {
      // Delay to allow browser to update
      setTimeout(() => this.scheduleUpdate(), 100);
    }, { passive: true });
    
    // 4. Visual Viewport API (most accurate on mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.scheduleUpdate.bind(this), { passive: true });
      window.visualViewport.addEventListener('scroll', this.scheduleUpdate.bind(this), { passive: true });
    }
    
    // 5. Screen Orientation API
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        setTimeout(() => this.scheduleUpdate(), 100);
      });
    }
    
    // 6. ResizeObserver on document element
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleUpdate();
      });
      this.resizeObserver.observe(document.documentElement);
      
      // Also observe body for layout changes
      if (document.body) {
        this.resizeObserver.observe(document.body);
      }
    }
    
    // 7. Media query listeners for specific breakpoints
    this.setupMediaQueryListeners();
    
    // 8. Foldable Screen API (experimental - Chrome on foldables)
    this.setupFoldableAPI();
    
    // 9. Page visibility change (for when app comes back from background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => this.scheduleUpdate(), 100);
      }
    });
    
    // 10. Fullscreen change
    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => this.scheduleUpdate(), 100);
    });
  }
  
  private setupMediaQueryListeners(): void {
    const breakpoints = [
      '(max-width: 319px)',
      '(min-width: 320px) and (max-width: 374px)',
      '(min-width: 375px) and (max-width: 430px)',
      '(min-width: 431px) and (max-width: 600px)',
      '(min-width: 601px) and (max-width: 900px)',
      '(min-width: 901px) and (max-width: 1100px)',
      '(min-width: 1101px)',
      '(orientation: portrait)',
      '(orientation: landscape)',
      '(min-aspect-ratio: 3/4) and (max-aspect-ratio: 4/3)',
      '(prefers-reduced-motion: reduce)',
    ];
    
    breakpoints.forEach(query => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', () => this.scheduleUpdate());
      this.mediaQueryLists.push(mql);
    });
  }
  
  private setupFoldableAPI(): void {
    // Experimental: Window Segments API for foldables
    // @ts-ignore - Experimental API
    if ('getWindowSegments' in window.visualViewport) {
      // @ts-ignore
      window.visualViewport.addEventListener('segmentschange', () => {
        this.scheduleUpdate();
      });
    }
    
    // Experimental: Device Posture API
    // @ts-ignore - Experimental API
    if ('devicePosture' in navigator) {
      // @ts-ignore
      navigator.devicePosture.addEventListener('change', () => {
        this.scheduleUpdate();
      });
    }
  }
  
  private scheduleUpdate(): void {
    const now = performance.now();
    
    // Throttle updates
    if (now - this.lastUpdate < this.updateThrottle) {
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null;
          this.update();
        });
      }
      return;
    }
    
    this.update();
  }
  
  private update(): void {
    this.lastUpdate = performance.now();
    const newState = this.computeState();
    
    // Check if state actually changed
    if (this.hasStateChanged(newState)) {
      this.state = newState;
      this.applyState();
      this.notifyListeners();
    }
  }
  
  private hasStateChanged(newState: ResponsiveState): boolean {
    return (
      this.state.width !== newState.width ||
      this.state.height !== newState.height ||
      this.state.deviceType !== newState.deviceType ||
      this.state.isPortrait !== newState.isPortrait ||
      this.state.optimalBoardSize !== newState.optimalBoardSize
    );
  }
  
  private computeState(): ResponsiveState {
    // Get dimensions from multiple sources for accuracy
    const vv = window.visualViewport;
    
    // Visual viewport is most accurate on mobile
    const visualWidth = vv ? Math.round(vv.width) : window.innerWidth;
    const visualHeight = vv ? Math.round(vv.height) : window.innerHeight;
    
    // Window dimensions as fallback
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Use the smaller of visual/window to be safe
    const width = Math.min(visualWidth, windowWidth);
    const height = Math.min(visualHeight, windowHeight);
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    const aspectRatio = width / height;
    const isPortrait = height > width;
    const isLandscape = !isPortrait;
    
    // Detect device type
    const deviceType = this.detectDeviceType(width, height, aspectRatio);
    const isFoldable = deviceType === 'foldable-folded' || deviceType === 'foldable-unfolded';
    const isFolded = deviceType === 'foldable-folded';
    
    // Calculate optimal board size
    const optimalBoardSize = this.calculateBoardSize(width, height, deviceType);
    
    // Get safe area insets
    const safeAreaInsets = this.getSafeAreaInsets();
    
    return {
      width,
      height,
      visualWidth,
      visualHeight,
      deviceType,
      devicePixelRatio,
      isPortrait,
      isLandscape,
      aspectRatio,
      isFoldable,
      isFolded,
      optimalBoardSize,
      safeAreaInsets,
    };
  }
  
  private detectDeviceType(width: number, height: number, aspectRatio: number): DeviceType {
    // Desktop
    if (width >= 1101) {
      return 'desktop';
    }
    
    // Tablet
    if (width >= 601 && width <= 1100) {
      // Check if it's a foldable unfolded (close to square aspect ratio)
      if (aspectRatio >= 0.75 && aspectRatio <= 1.33 && width >= 800) {
        return 'foldable-unfolded';
      }
      return 'tablet';
    }
    
    // Foldable folded detection
    // Honor Magic V3: ~374x832 (aspect ~0.45)
    // Samsung Z Fold: ~374x841 (aspect ~0.44)
    // Oppo Find N: ~402x888 (aspect ~0.45)
    if (width >= 370 && width <= 420 && height >= 750 && aspectRatio < 0.55) {
      return 'foldable-folded';
    }
    
    // Foldable unfolded (square-ish screens)
    if (aspectRatio >= 0.75 && aspectRatio <= 1.33 && width >= 600) {
      return 'foldable-unfolded';
    }
    
    // Phone sizes
    if (width < 320) {
      return 'phone-xs';
    }
    
    if (width < 375) {
      return 'phone-sm';
    }
    
    if (width <= 430) {
      return 'phone-md';
    }
    
    return 'phone-lg';
  }
  
  private calculateBoardSize(width: number, height: number, deviceType: DeviceType): number {
    // Reserved space for UI elements (player cards, buttons, etc.)
    const reservedSpace: Record<DeviceType, number> = {
      'phone-xs': 160,
      'phone-sm': 180,
      'phone-md': 200,
      'phone-lg': 220,
      'foldable-folded': 240,
      'foldable-unfolded': 280,
      'tablet': 300,
      'desktop': 100,
    };
    
    // Maximum board sizes
    const maxSizes: Record<DeviceType, number> = {
      'phone-xs': 300,
      'phone-sm': 340,
      'phone-md': 380,
      'phone-lg': 420,
      'foldable-folded': 340,
      'foldable-unfolded': 580,
      'tablet': 550,
      'desktop': 600,
    };
    
    const reserved = reservedSpace[deviceType];
    const maxSize = maxSizes[deviceType];
    
    // Calculate available space
    const availableWidth = width - 16; // 8px padding each side
    const availableHeight = height - reserved;
    
    // Board should be square, use smaller dimension
    let boardSize = Math.min(availableWidth, availableHeight);
    
    // Apply max limit
    boardSize = Math.min(boardSize, maxSize);
    
    // Ensure minimum size
    boardSize = Math.max(boardSize, 280);
    
    return Math.floor(boardSize);
  }
  
  private getSafeAreaInsets(): ResponsiveState['safeAreaInsets'] {
    // Try to get safe area insets from CSS
    const computedStyle = getComputedStyle(document.documentElement);
    
    const parseInset = (value: string): number => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    return {
      top: parseInset(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInset(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInset(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInset(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
    };
  }
  
  private applyState(): void {
    const { state } = this;
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all device type classes
    const deviceClasses = [
      'viewport-phone-xs',
      'viewport-phone-sm',
      'viewport-phone-md',
      'viewport-phone-lg',
      'viewport-phone-small',
      'viewport-phone-medium',
      'viewport-phone-large',
      'viewport-foldable-folded',
      'viewport-foldable-unfolded',
      'viewport-foldable',
      'viewport-tablet',
      'viewport-desktop',
      'viewport-portrait',
      'viewport-landscape',
    ];
    
    root.classList.remove(...deviceClasses);
    body.classList.remove(...deviceClasses);
    
    // Add current device type class
    const deviceClass = `viewport-${state.deviceType}`;
    root.classList.add(deviceClass);
    body.classList.add(deviceClass);
    
    // Add legacy classes for compatibility
    if (state.deviceType === 'phone-xs' || state.deviceType === 'phone-sm') {
      root.classList.add('viewport-phone-small');
      body.classList.add('viewport-phone-small');
    } else if (state.deviceType === 'phone-md') {
      root.classList.add('viewport-phone-medium');
      body.classList.add('viewport-phone-medium');
    } else if (state.deviceType === 'phone-lg') {
      root.classList.add('viewport-phone-large');
      body.classList.add('viewport-phone-large');
    }
    
    // Add orientation class
    const orientationClass = state.isPortrait ? 'viewport-portrait' : 'viewport-landscape';
    root.classList.add(orientationClass);
    body.classList.add(orientationClass);
    
    // Add foldable class if applicable
    if (state.isFoldable) {
      root.classList.add('viewport-foldable');
      body.classList.add('viewport-foldable');
    }
    
    // Set CSS custom properties
    root.style.setProperty('--viewport-width', `${state.width}px`);
    root.style.setProperty('--viewport-height', `${state.height}px`);
    root.style.setProperty('--viewport-ratio', state.aspectRatio.toFixed(3));
    root.style.setProperty('--optimal-board-size', `${state.optimalBoardSize}px`);
    root.style.setProperty('--device-pixel-ratio', state.devicePixelRatio.toString());
    
    // Set safe area insets as CSS variables
    root.style.setProperty('--safe-area-inset-top', `${state.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${state.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${state.safeAreaInsets.left}px`);
    root.style.setProperty('--safe-area-inset-right', `${state.safeAreaInsets.right}px`);
    
    // Log state change in development
    console.log(
      `[ResponsiveManager] ${state.deviceType}`,
      `${state.width}x${state.height}`,
      `board: ${state.optimalBoardSize}px`,
      state.isPortrait ? 'portrait' : 'landscape',
      state.isFoldable ? '(foldable)' : ''
    );
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[ResponsiveManager] Listener error:', error);
      }
    });
  }
  
  /**
   * Subscribe to responsive state changes
   */
  subscribe(listener: ResponsiveListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Get current responsive state
   */
  getState(): ResponsiveState {
    return { ...this.state };
  }
  
  /**
   * Force a state update
   */
  forceUpdate(): void {
    this.state = this.computeState();
    this.applyState();
    this.notifyListeners();
  }
  
  /**
   * Check if device is a foldable
   */
  isFoldable(): boolean {
    return this.state.isFoldable;
  }
  
  /**
   * Check if foldable is in folded mode
   */
  isFolded(): boolean {
    return this.state.isFolded;
  }
  
  /**
   * Get optimal board size
   */
  getOptimalBoardSize(): number {
    return this.state.optimalBoardSize;
  }
  
  /**
   * Destroy the manager and clean up
   */
  destroy(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.scheduleUpdate.bind(this));
    window.removeEventListener('orientationchange', this.scheduleUpdate.bind(this));
    
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.scheduleUpdate.bind(this));
      window.visualViewport.removeEventListener('scroll', this.scheduleUpdate.bind(this));
    }
    
    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Remove media query listeners
    this.mediaQueryLists.forEach(mql => {
      mql.removeEventListener('change', this.scheduleUpdate.bind(this));
    });
    this.mediaQueryLists = [];
    
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Clear listeners
    this.listeners.clear();
  }
}

// Singleton instance
let instance: ResponsiveManager | null = null;

export function getResponsiveManager(): ResponsiveManager {
  if (!instance) {
    instance = new ResponsiveManager();
  }
  return instance;
}

export function initResponsiveManager(): ResponsiveManager {
  return getResponsiveManager();
}

export default ResponsiveManager;