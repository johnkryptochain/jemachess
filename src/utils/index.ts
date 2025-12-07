/**
 * Utilities Module
 *
 * This module exports all utility classes and functions:
 * - ChessTimer: Chess clock with increment support
 * - SoundManager: Game sound effects management
 * - AudioGenerator: Web Audio API sound synthesis
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

// Viewport detection utilities
export {
  getViewportDetector,
  initViewportDetector,
  type DeviceMode,
  type ViewportInfo
} from './ViewportDetector';