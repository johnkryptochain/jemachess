/**
 * Toast Notification Component
 * 
 * Provides a simple toast notification system for displaying
 * temporary messages to the user.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast configuration options
 */
export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Default toast options
 */
const DEFAULT_OPTIONS: Required<ToastOptions> = {
  type: 'info',
  duration: 3000,
  dismissible: true,
};

/**
 * Toast class for displaying notifications
 */
export class Toast {
  private static instance: Toast | null = null;
  private container: HTMLElement | null = null;
  private currentToast: HTMLElement | null = null;
  private hideTimeout: number | null = null;

  private constructor() {
    this.createContainer();
  }

  /**
   * Gets the singleton Toast instance
   */
  static getInstance(): Toast {
    if (!Toast.instance) {
      Toast.instance = new Toast();
    }
    return Toast.instance;
  }

  /**
   * Creates the toast container element
   */
  private createContainer(): void {
    // Check if container already exists
    this.container = document.querySelector('.toast-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Shows a toast message
   * @param message The message to display
   * @param type The type of toast (info, success, warning, error)
   * @param duration How long to show the toast in milliseconds
   */
  show(message: string, type?: ToastType, duration?: number): void {
    const options: Required<ToastOptions> = {
      ...DEFAULT_OPTIONS,
      type: type ?? DEFAULT_OPTIONS.type,
      duration: duration ?? DEFAULT_OPTIONS.duration,
    };

    this.showWithOptions(message, options);
  }

  /**
   * Shows a toast with full options
   * @param message The message to display
   * @param options Toast configuration options
   */
  showWithOptions(message: string, options: ToastOptions = {}): void {
    const mergedOptions: Required<ToastOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Hide any existing toast
    this.hide();

    // Ensure container exists
    if (!this.container) {
      this.createContainer();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${mergedOptions.type}`;
    
    // Create message content
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Add dismiss button if dismissible
    if (mergedOptions.dismissible) {
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'toast-dismiss';
      dismissBtn.innerHTML = '&times;';
      dismissBtn.addEventListener('click', () => this.hide());
      toast.appendChild(dismissBtn);
    }

    // Add icon based on type
    const icon = this.getIcon(mergedOptions.type);
    if (icon) {
      toast.insertBefore(icon, messageSpan);
    }

    // Add to container
    this.container?.appendChild(toast);
    this.currentToast = toast;

    // Trigger show animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-hide after duration
    if (mergedOptions.duration > 0) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, mergedOptions.duration);
    }
  }

  /**
   * Hides the current toast
   */
  hide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.currentToast) {
      this.currentToast.classList.remove('show');
      
      const toast = this.currentToast;
      setTimeout(() => {
        toast.remove();
      }, 300); // Match CSS transition duration
      
      this.currentToast = null;
    }
  }

  /**
   * Gets an icon element for the toast type
   */
  private getIcon(type: ToastType): HTMLElement | null {
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    
    switch (type) {
      case 'success':
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        break;
      case 'error':
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        break;
      case 'warning':
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 7v4m0 4h.01M3.072 17h13.856c1.54 0 2.502-1.667 1.732-3L11.732 3c-.77-1.333-2.694-1.333-3.464 0L1.34 14c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        break;
      case 'info':
      default:
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 14v-4m0-4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        break;
    }
    
    return icon;
  }

  /**
   * Shows a success toast
   */
  static success(message: string, duration?: number): void {
    Toast.getInstance().show(message, 'success', duration);
  }

  /**
   * Shows an error toast
   */
  static error(message: string, duration?: number): void {
    Toast.getInstance().show(message, 'error', duration);
  }

  /**
   * Shows a warning toast
   */
  static warning(message: string, duration?: number): void {
    Toast.getInstance().show(message, 'warning', duration);
  }

  /**
   * Shows an info toast
   */
  static info(message: string, duration?: number): void {
    Toast.getInstance().show(message, 'info', duration);
  }
}