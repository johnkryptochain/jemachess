/**
 * Utilities Module
 *
 * This module exports all utility classes and functions:
 * - ChessTimer: Chess clock with increment support
 * - SoundManager: Game sound effects management
 * - AudioGenerator: Web Audio API sound synthesis
 * - ResponsiveManager: ULTIMATE responsive solution 2025
 */

// Timer utilities
export {
  ChessTimer,
  TIME_CONTROLS,
  type TimerConfig,
  type TimerCallback,
  type TimeoutCallback
} from './Timer';

// Sound utilities
export {
  SoundManager,
  getSoundManager,
  type SoundType
} from './SoundManager';

// Audio generation utilities
export {
  AudioGenerator,
  getAudioGenerator,
  type GeneratedSoundType
} from './AudioGenerator';

// PWA utilities
export {
  PWAInstaller,
  pwaInstaller,
  registerServiceWorker,
  unregisterServiceWorkers,
  isOnline,
  onConnectivityChange,
  type BeforeInstallPromptEvent
} from './pwa';

// Viewport detection utilities (legacy)
export {
  getViewportDetector,
  initViewportDetector,
  type DeviceMode,
  type ViewportInfo
} from './ViewportDetector';

// ULTIMATE Responsive Manager 2025
export {
  getResponsiveManager,
  initResponsiveManager,
  type DeviceType,
  type ResponsiveState
} from './ResponsiveManager';