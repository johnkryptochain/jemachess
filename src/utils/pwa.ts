/**
 * PWA Installation Helper
 * Handles PWA installation prompts and status detection for ChromeOS and other platforms
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export class PWAInstaller {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled: boolean = false;

  // Event callbacks
  public onInstallAvailable: (() => void) | null = null;
  public onInstalled: (() => void) | null = null;

  constructor() {
    this.isInstalled = this.checkIfInstalled();
  }

  /**
   * Initialize the PWA installer - listen for install events
   */
  init(): void {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = event;
      
      // Notify that installation is available
      if (this.onInstallAvailable) {
        this.onInstallAvailable();
      }
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Notify that app was installed
      if (this.onInstalled) {
        this.onInstalled();
      }
      
      // Log installation for analytics
      console.log('Chess Royale PWA was installed');
    });

    // Check if already running as PWA
    if (this.isRunningAsPWA()) {
      this.isInstalled = true;
    }
  }

  /**
   * Check if the app can be installed
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  /**
   * Check if the app is already installed
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Trigger the install prompt
   * @returns Promise<boolean> - true if user accepted, false if dismissed
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    // Show the install prompt
    await this.deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await this.deferredPrompt.userChoice;

    // Clear the deferred prompt
    this.deferredPrompt = null;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      return true;
    } else {
      console.log('User dismissed the install prompt');
      return false;
    }
  }

  /**
   * Check if the app is running as a PWA (standalone mode)
   */
  isRunningAsPWA(): boolean {
    // Check display-mode media query
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check iOS standalone mode
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
      return true;
    }

    // Check if launched from home screen on Android
    if (document.referrer.includes('android-app://')) {
      return true;
    }

    return false;
  }

  /**
   * Check if running on ChromeOS
   */
  isChromeos(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('cros');
  }

  /**
   * Check if the device supports PWA installation
   */
  supportsPWA(): boolean {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  }

  /**
   * Get the current platform for display purposes
   */
  getPlatform(): 'chromeos' | 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (userAgent.includes('cros')) return 'chromeos';
    if (userAgent.includes('android')) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('linux')) return 'linux';
    
    return 'unknown';
  }

  /**
   * Check if the app was installed (persisted check)
   */
  private checkIfInstalled(): boolean {
    // Check localStorage for installation flag
    const installed = localStorage.getItem('chess-royale-installed');
    if (installed === 'true') {
      return true;
    }

    // Check if running in standalone mode
    return this.isRunningAsPWA();
  }

  /**
   * Mark the app as installed in localStorage
   */
  markAsInstalled(): void {
    localStorage.setItem('chess-royale-installed', 'true');
    this.isInstalled = true;
  }
}

// Singleton instance
export const pwaInstaller = new PWAInstaller();

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered with scope:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify user
            console.log('New content available, please refresh');
            
            // Optionally auto-update
            if (confirm('A new version of Chess Royale is available. Reload to update?')) {
              newWorker.postMessage('skipWaiting');
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers (useful for development)
 */
export async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  console.log('All service workers unregistered');
}

/**
 * Check if the app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}