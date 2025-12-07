/**
 * Chess Royale - Main Entry Point
 *
 * A peer-to-peer chess game with glassmorphism UI,
 * featuring multiple piece themes and WebRTC networking.
 *
 * Uses ULTIMATE responsive solution 2025 for all devices.
 */

import { App } from './app';
import { initResponsiveManager } from './utils/ResponsiveManager';
import './ui/styles/index.css';

// Application instance
let app: App | null = null;

// Responsive manager instance (ULTIMATE 2025 solution)
const responsiveManager = initResponsiveManager();

/**
 * Initialize the application when DOM is ready
 */
async function initializeApp(): Promise<void> {
  const container = document.getElementById('app');
  
  if (!container) {
    console.error('App container not found');
    showErrorMessage('Application container not found. Please refresh the page.');
    return;
  }
  
  try {
    // Force initial responsive state application
    responsiveManager.forceUpdate();
    
    // Subscribe to responsive changes for logging
    responsiveManager.subscribe((state) => {
      console.log(
        '[Responsive]',
        state.deviceType,
        `${state.width}x${state.height}`,
        `board: ${state.optimalBoardSize}px`,
        state.isPortrait ? 'portrait' : 'landscape',
        state.isFoldable ? '(foldable)' : ''
      );
    });
    
    // Create and initialize the app
    app = new App(container);
    await app.init();
    
    console.log('Chess Royale initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Chess Royale:', error);
    showErrorMessage('Failed to initialize the application. Please refresh the page.');
  }
}

/**
 * Show an error message to the user
 * @param message The error message to display
 */
function showErrorMessage(message: string): void {
  const container = document.getElementById('app');
  if (container) {
    container.innerHTML = `
      <div class="error-container">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2>Failed to Load</h2>
        <p>${message}</p>
        <button class="glass-button primary" onclick="location.reload()">
          Refresh Page
        </button>
      </div>
    `;
  }
}

/**
 * Register the service worker for PWA support
 */
async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('Service Worker registered:', registration.scope);
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update notification
            console.log('New version available! Refresh to update.');
          }
        });
      }
    });
  } catch (error) {
    console.log('Service Worker registration failed:', error);
  }
}

/**
 * Handle beforeunload event to clean up resources
 */
function handleBeforeUnload(): void {
  if (app) {
    app.destroy();
    app = null;
  }
}

/**
 * Handle visibility change for app lifecycle
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    // App is being hidden, could save state here
    console.log('App hidden');
  } else {
    // App is visible again
    console.log('App visible');
  }
}

// ============================================
// Event Listeners
// ============================================

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}

// Register service worker after page load
window.addEventListener('load', registerServiceWorker);

// Clean up on page unload
window.addEventListener('beforeunload', handleBeforeUnload);

// Handle visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Handle online/offline status
window.addEventListener('online', () => {
  console.log('App is online');
});

window.addEventListener('offline', () => {
  console.log('App is offline');
});

// Export app instance for debugging in development
declare global {
  interface Window {
    chessApp?: App | null;
  }
}

// Use try-catch to handle environments where import.meta.env might not exist
try {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    window.chessApp = app;
  }
} catch {
  // Ignore in production
}