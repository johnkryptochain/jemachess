/**
 * Chess Timer Module
 * 
 * Provides accurate chess timer functionality with:
 * - Configurable initial time and increment
 * - Pause/resume support
 * - Tab visibility handling
 * - Low time warnings
 * - Timeout detection
 */

import { PieceColor } from '../types';

/**
 * Timer configuration
 */
export interface TimerConfig {
  /** Initial time in milliseconds */
  initialTime: number;
  /** Increment in milliseconds to add after each move */
  increment: number;
}

/**
 * Callback type for timer tick events
 */
export type TimerCallback = (whiteTime: number, blackTime: number) => void;

/**
 * Callback type for timeout events
 */
export type TimeoutCallback = (color: PieceColor) => void;

/**
 * Preset time controls
 */
export const TIME_CONTROLS = {
  /** Bullet: 1 minute, no increment */
  BULLET_1_0: { initialTime: 60 * 1000, increment: 0 },
  /** Bullet: 1 minute + 1 second increment */
  BULLET_1_1: { initialTime: 60 * 1000, increment: 1000 },
  /** Bullet: 2 minutes + 1 second increment */
  BULLET_2_1: { initialTime: 2 * 60 * 1000, increment: 1000 },
  /** Blitz: 3 minutes, no increment */
  BLITZ_3_0: { initialTime: 3 * 60 * 1000, increment: 0 },
  /** Blitz: 3 minutes + 2 second increment */
  BLITZ_3_2: { initialTime: 3 * 60 * 1000, increment: 2000 },
  /** Blitz: 5 minutes, no increment */
  BLITZ_5_0: { initialTime: 5 * 60 * 1000, increment: 0 },
  /** Blitz: 5 minutes + 3 second increment */
  BLITZ_5_3: { initialTime: 5 * 60 * 1000, increment: 3000 },
  /** Rapid: 10 minutes, no increment */
  RAPID_10_0: { initialTime: 10 * 60 * 1000, increment: 0 },
  /** Rapid: 10 minutes + 5 second increment */
  RAPID_10_5: { initialTime: 10 * 60 * 1000, increment: 5000 },
  /** Rapid: 15 minutes + 10 second increment */
  RAPID_15_10: { initialTime: 15 * 60 * 1000, increment: 10000 },
  /** Classical: 30 minutes, no increment */
  CLASSICAL_30_0: { initialTime: 30 * 60 * 1000, increment: 0 },
} as const;

/**
 * Low time threshold in milliseconds (30 seconds)
 */
const LOW_TIME_THRESHOLD = 30 * 1000;

/**
 * Timer update interval in milliseconds
 */
const TIMER_INTERVAL = 100;

/**
 * Chess Timer class
 * 
 * Manages time for both players with accurate tracking,
 * increment support, and visibility change handling.
 */
export class ChessTimer {
  private whiteTime: number;
  private blackTime: number;
  private increment: number;
  private activeColor: PieceColor | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTick: number = 0;
  private isPaused: boolean = false;
  private visibilityHandler: (() => void) | null = null;

  /** Callback fired on each timer tick */
  public onTick: TimerCallback | null = null;
  
  /** Callback fired when a player runs out of time */
  public onTimeout: TimeoutCallback | null = null;
  
  /** Callback fired when time becomes low (< 30 seconds) */
  public onLowTime: ((color: PieceColor) => void) | null = null;

  private whiteLowTimeWarned: boolean = false;
  private blackLowTimeWarned: boolean = false;

  /**
   * Create a new chess timer
   * @param config Timer configuration with initial time and increment
   */
  constructor(config: TimerConfig) {
    this.whiteTime = config.initialTime;
    this.blackTime = config.initialTime;
    this.increment = config.increment;
    
    // Set up visibility change handler
    this.setupVisibilityHandler();
  }

  /**
   * Set up handler for tab visibility changes
   * Ensures accurate time tracking when tab is hidden/shown
   */
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.activeColor && !this.isPaused) {
        // Tab became visible, recalculate elapsed time
        const now = performance.now();
        const elapsed = now - this.lastTick;
        
        if (this.activeColor === PieceColor.WHITE) {
          this.whiteTime = Math.max(0, this.whiteTime - elapsed);
        } else {
          this.blackTime = Math.max(0, this.blackTime - elapsed);
        }
        
        this.lastTick = now;
        this.checkTimeout();
        this.notifyTick();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Start the timer for a specific color
   * @param color The color whose timer should start
   */
  start(color: PieceColor): void {
    // Stop any existing timer
    this.stopInterval();
    
    this.activeColor = color;
    this.isPaused = false;
    this.lastTick = performance.now();
    
    // Start the interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, TIMER_INTERVAL);
  }

  /**
   * Stop the timer completely
   */
  stop(): void {
    this.stopInterval();
    this.activeColor = null;
    this.isPaused = false;
  }

  /**
   * Pause the timer (can be resumed)
   */
  pause(): void {
    if (this.activeColor && !this.isPaused) {
      // Update time before pausing
      this.tick();
      this.stopInterval();
      this.isPaused = true;
    }
  }

  /**
   * Resume a paused timer
   */
  resume(): void {
    if (this.activeColor && this.isPaused) {
      this.isPaused = false;
      this.lastTick = performance.now();
      
      this.intervalId = setInterval(() => {
        this.tick();
      }, TIMER_INTERVAL);
    }
  }

  /**
   * Switch the timer to the other player
   * Adds increment to the player who just moved
   */
  switch(): void {
    if (!this.activeColor) return;
    
    // Update time for current player
    this.tick();
    
    // Add increment to the player who just moved
    if (this.activeColor === PieceColor.WHITE) {
      this.whiteTime += this.increment;
    } else {
      this.blackTime += this.increment;
    }
    
    // Switch to other player
    const newColor = this.activeColor === PieceColor.WHITE 
      ? PieceColor.BLACK 
      : PieceColor.WHITE;
    
    this.start(newColor);
  }

  /**
   * Get remaining time for a color
   * @param color The color to get time for
   * @returns Remaining time in milliseconds
   */
  getTime(color: PieceColor): number {
    return color === PieceColor.WHITE ? this.whiteTime : this.blackTime;
  }

  /**
   * Set time for a color (useful for synchronization)
   * @param color The color to set time for
   * @param time Time in milliseconds
   */
  setTime(color: PieceColor, time: number): void {
    if (color === PieceColor.WHITE) {
      this.whiteTime = Math.max(0, time);
    } else {
      this.blackTime = Math.max(0, time);
    }
    this.notifyTick();
  }

  /**
   * Reset the timer with optional new configuration
   * @param config Optional new timer configuration
   */
  reset(config?: TimerConfig): void {
    this.stop();
    
    if (config) {
      this.whiteTime = config.initialTime;
      this.blackTime = config.initialTime;
      this.increment = config.increment;
    } else {
      // Reset to current config's initial time
      this.whiteTime = this.whiteTime; // Keep current if no config
      this.blackTime = this.blackTime;
    }
    
    this.whiteLowTimeWarned = false;
    this.blackLowTimeWarned = false;
    this.notifyTick();
  }

  /**
   * Check if a player is in low time (< 30 seconds)
   * @param color The color to check
   * @returns True if time is low
   */
  isLowTime(color: PieceColor): boolean {
    const time = this.getTime(color);
    return time > 0 && time < LOW_TIME_THRESHOLD;
  }

  /**
   * Check if the timer is currently running
   * @returns True if timer is active and not paused
   */
  isRunning(): boolean {
    return this.activeColor !== null && !this.isPaused;
  }

  /**
   * Get the currently active color
   * @returns The active color or null if timer is stopped
   */
  getActiveColor(): PieceColor | null {
    return this.activeColor;
  }

  /**
   * Format time for display
   * @param ms Time in milliseconds
   * @returns Formatted time string (e.g., "5:30" or "0:05.3")
   */
  static formatTime(ms: number): string {
    if (ms <= 0) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Show tenths of seconds when under 10 seconds
    if (ms < 10000) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parse a time control string (e.g., "5+3" for 5 minutes + 3 second increment)
   * @param timeControl Time control string
   * @returns Timer configuration
   */
  static parseTimeControl(timeControl: string): TimerConfig {
    const match = timeControl.match(/^(\d+)\+(\d+)$/);
    if (match) {
      return {
        initialTime: parseInt(match[1], 10) * 60 * 1000,
        increment: parseInt(match[2], 10) * 1000,
      };
    }
    
    // Default to 10 minutes, no increment
    return TIME_CONTROLS.RAPID_10_0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * Internal tick handler
   */
  private tick(): void {
    if (!this.activeColor || this.isPaused) return;
    
    const now = performance.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;
    
    // Deduct time from active player
    if (this.activeColor === PieceColor.WHITE) {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed);
    } else {
      this.blackTime = Math.max(0, this.blackTime - elapsed);
    }
    
    // Check for low time warnings
    this.checkLowTime();
    
    // Check for timeout
    this.checkTimeout();
    
    // Notify listeners
    this.notifyTick();
  }

  /**
   * Check and emit low time warnings
   */
  private checkLowTime(): void {
    if (!this.whiteLowTimeWarned && this.isLowTime(PieceColor.WHITE)) {
      this.whiteLowTimeWarned = true;
      this.onLowTime?.(PieceColor.WHITE);
    }
    
    if (!this.blackLowTimeWarned && this.isLowTime(PieceColor.BLACK)) {
      this.blackLowTimeWarned = true;
      this.onLowTime?.(PieceColor.BLACK);
    }
  }

  /**
   * Check for timeout and emit event
   */
  private checkTimeout(): void {
    if (this.activeColor === PieceColor.WHITE && this.whiteTime <= 0) {
      this.stop();
      this.onTimeout?.(PieceColor.WHITE);
    } else if (this.activeColor === PieceColor.BLACK && this.blackTime <= 0) {
      this.stop();
      this.onTimeout?.(PieceColor.BLACK);
    }
  }

  /**
   * Notify tick listeners
   */
  private notifyTick(): void {
    this.onTick?.(this.whiteTime, this.blackTime);
  }

  /**
   * Stop the interval timer
   */
  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}