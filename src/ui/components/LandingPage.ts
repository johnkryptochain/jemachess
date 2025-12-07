/**
 * Copyright (c) 2025 Jema Technology.
 * Distributed under the license specified in the root directory of this project.
 *
 * Landing Page Component
 *
 * A modern landing page with glassmorphism design.
 * Features a sidebar navigation, hero section with chess pieces,
 * and call-to-action buttons.
 */

import { store, GameStats } from '../../store';

/**
 * Navigation item configuration
 */
interface NavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  hasSubmenu?: boolean;
}

/**
 * Submenu item configuration
 */
interface SubmenuItem {
  id: string;
  label: string;
  icon: string;
}

/**
 * LandingPage class for the main landing/home screen
 */
export class LandingPage {
  private container: HTMLElement;
  private pageElement: HTMLElement | null = null;
  private mobileMenuOpen: boolean = false;
  private activeSubmenu: string | null = null;
  private submenuElement: HTMLElement | null = null;
  private sidebarCollapsed: boolean = false;

  // Event callbacks
  public onGetStarted: (() => void) | null = null;
  public onPlay: (() => void) | null = null;
  public onSettings: (() => void) | null = null;
  public onSocial: (() => void) | null = null;
  public onLearn: (() => void) | null = null;
  public onPlayVsBots: (() => void) | null = null;
  public onPlayWithCoach: (() => void) | null = null;
  public onPlayOnline: (() => void) | null = null;
  public onPlayLocal: (() => void) | null = null;

  // Real stats from store
  private gameStats: GameStats;
  private statsInterval: number | null = null;
  private storeUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.gameStats = store.getState().gameStats;
  }

  /**
   * Get user data from localStorage
   */
  private getUserData(): { username: string; elo: number } {
    try {
      const stored = localStorage.getItem('jemachess-user');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          username: data.username || 'Invité',
          elo: data.elo !== undefined ? data.elo : 0
        };
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
    return { username: 'Invité', elo: 0 };
  }

  /**
   * Save user data to localStorage
   */
  private saveUserData(username: string, elo: number): void {
    try {
      localStorage.setItem('jemachess-user', JSON.stringify({ username, elo }));
    } catch (error) {
      console.warn('Failed to save user data:', error);
    }
  }

  /**
   * Show edit profile modal
   */
  private showEditProfileModal(): void {
    const userData = this.getUserData();
    
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.innerHTML = `
      <div class="profile-modal-content">
        <h3>Modifier le profil</h3>
        <div class="profile-form">
          <label for="username-input">Pseudo</label>
          <input type="text" id="username-input" class="glass-input" value="${userData.username}" maxlength="20" placeholder="Entrez votre pseudo">
          <p class="input-hint">Votre pseudo sera sauvegardé localement</p>
        </div>
        <div class="profile-elo">
          <span class="elo-label">Votre ELO</span>
          <span class="elo-value">${userData.elo}</span>
          <p class="elo-hint">L'ELO évolue en fonction de vos parties contre l'IA</p>
        </div>
        <div class="profile-actions">
          <button class="glass-button secondary cancel-btn">Annuler</button>
          <button class="glass-button primary save-btn">Enregistrer</button>
        </div>
      </div>
    `;

    // Add modal styles
    this.addProfileModalStyles();

    // Handle save
    const saveBtn = modal.querySelector('.save-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const usernameInput = modal.querySelector('#username-input') as HTMLInputElement;

    saveBtn?.addEventListener('click', () => {
      const newUsername = usernameInput.value.trim() || 'Invité';
      this.saveUserData(newUsername, userData.elo);
      this.updateUserDisplay(newUsername, userData.elo);
      modal.remove();
    });

    cancelBtn?.addEventListener('click', () => {
      modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Handle Enter key
    usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveBtn?.dispatchEvent(new Event('click'));
      }
    });

    document.body.appendChild(modal);
    usernameInput?.focus();
    usernameInput?.select();
  }

  /**
   * Update user display in sidebar
   */
  private updateUserDisplay(username: string, elo: number): void {
    const userNameEl = this.pageElement?.querySelector('.user-name');
    const userRatingEl = this.pageElement?.querySelector('.user-rating');
    
    if (userNameEl) {
      userNameEl.textContent = username;
    }
    if (userRatingEl) {
      userRatingEl.textContent = `${elo} ELO`;
    }
  }

  /**
   * Add profile modal styles
   */
  private addProfileModalStyles(): void {
    const styleId = 'profile-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .profile-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .profile-modal-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .profile-modal h3 {
        margin: 0 0 24px 0;
        text-align: center;
        color: #fff;
        font-size: 1.5rem;
      }
      
      .profile-form {
        margin-bottom: 24px;
      }
      
      .profile-form label {
        display: block;
        margin-bottom: 8px;
        color: #fff;
        font-weight: 500;
      }
      
      .profile-form .glass-input {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .profile-form .glass-input:focus {
        border-color: #7d82ea;
      }
      
      .input-hint {
        margin: 8px 0 0 0;
        font-size: 0.8rem;
        color: #888;
      }
      
      .profile-elo {
        background: rgba(125, 130, 234, 0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: center;
      }
      
      .elo-label {
        display: block;
        color: #888;
        font-size: 0.9rem;
        margin-bottom: 4px;
      }
      
      .elo-value {
        display: block;
        color: #7d82ea;
        font-size: 2rem;
        font-weight: bold;
      }
      
      .elo-hint {
        margin: 8px 0 0 0;
        font-size: 0.75rem;
        color: #666;
      }
      
      .profile-actions {
        display: flex;
        gap: 12px;
      }
      
      .profile-actions .glass-button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .profile-actions .glass-button.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .profile-actions .glass-button.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .profile-actions .glass-button.primary {
        background: #7d82ea;
        color: #fff;
      }
      
      .profile-actions .glass-button.primary:hover {
        background: #6b70d8;
      }
      
      .sidebar-user .edit-icon {
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      
      .sidebar-user:hover .edit-icon {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update user ELO after a game
   * @param won Whether the user won the game
   * @param opponentStrength AI difficulty factor (0.5 for easy, 1.0 for medium, 1.5 for hard, 2.0 for master)
   */
  public updateElo(won: boolean, opponentStrength: number = 1.0): void {
    const userData = this.getUserData();
    const K = 32; // K-factor for ELO calculation
    
    // Expected score based on opponent strength
    const expectedScore = 1 / (1 + Math.pow(10, (opponentStrength * 400 - 0) / 400));
    const actualScore = won ? 1 : 0;
    
    // Calculate new ELO
    const newElo = Math.round(userData.elo + K * (actualScore - expectedScore));
    
    // Ensure ELO doesn't go below 100
    const finalElo = Math.max(100, newElo);
    
    this.saveUserData(userData.username, finalElo);
    this.updateUserDisplay(userData.username, finalElo);
  }

  /**
   * Start updating stats periodically
   */
  private startStatsUpdates(): void {
    // Subscribe to store changes
    this.storeUnsubscribe = store.subscribe((state) => {
      this.gameStats = state.gameStats;
      this.updateStatsDisplay();
    });
    
    // Initial update
    this.updateStatsDisplay();
  }

  /**
   * Update the stats display with real data
   */
  private updateStatsDisplay(): void {
    const gamesCreatedEl = this.pageElement?.querySelector('.stat-games-created .stat-number');
    const gamesOnlineEl = this.pageElement?.querySelector('.stat-games-online .stat-number');
    
    if (gamesCreatedEl) {
      gamesCreatedEl.textContent = this.formatNumber(this.gameStats.gamesCreated);
    }
    if (gamesOnlineEl) {
      gamesOnlineEl.textContent = this.formatNumber(this.gameStats.gamesOnline);
    }
  }

  /**
   * Format number with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Get submenu items for Play menu
   */
  private getPlaySubmenuItems(): SubmenuItem[] {
    return [
      {
        id: 'play-bots',
        label: 'Jouer contre l\'IA',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="11.5" r="1.5"/>
          <circle cx="15.5" cy="11.5" r="1.5"/>
          <path d="M9 16h6"/>
          <path d="M8 2v2M16 2v2"/>
        </svg>`
      },
      {
        id: 'play-coach',
        label: 'Jouer avec l\'entraîneur',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="5"/>
          <path d="M20 21a8 8 0 1 0-16 0"/>
          <path d="M12 11v4M10 13h4"/>
        </svg>`
      },
      {
        id: 'play-online',
        label: 'Jouer en ligne',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`
      },
      {
        id: 'play-local',
        label: 'Jouer avec un ami',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>`
      }
    ];
  }

  /**
   * Get navigation items
   */
  private getNavItems(): NavItem[] {
    return [
      {
        id: 'play',
        label: 'Jouer',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`,
        active: true,
        hasSubmenu: true
      },
      {
        id: 'learn',
        label: 'Apprendre',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>`
      },
      {
        id: 'social',
        label: 'Chat',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>`
      }
    ];
  }

  /**
   * Renders the landing page
   */
  render(): void {
    this.container.innerHTML = '';

    this.pageElement = document.createElement('div');
    this.pageElement.className = 'landing-page';

    // Create sidebar
    const sidebar = this.createSidebar();
    this.pageElement.appendChild(sidebar);

    // Create main content
    const main = this.createMainContent();
    this.pageElement.appendChild(main);

    // Create mobile menu button
    const mobileMenuBtn = this.createMobileMenuButton();
    this.pageElement.appendChild(mobileMenuBtn);

    this.container.appendChild(this.pageElement);

    // Start stats updates
    this.startStatsUpdates();

    // Add event listeners
    this.setupEventListeners();

    // Close submenu when clicking outside
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  /**
   * Handle document click to close submenu
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.submenuElement || !this.pageElement) return;
    
    const target = e.target as HTMLElement;
    const isNavItem = target.closest('.nav-item');
    const isSubmenu = target.closest('.nav-submenu');
    
    if (!isNavItem && !isSubmenu) {
      this.closeSubmenu();
    }
  }

  /**
   * Create the sidebar navigation
   */
  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'landing-sidebar';

    // Sidebar header with logo
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';

    // Logo section - minimal
    const logoSection = document.createElement('div');
    logoSection.className = 'sidebar-logo';
    logoSection.innerHTML = `
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 22H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2zM12 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 10l4 4 4-4H8zm4 8l4-4H8l4 4z"/>
        </svg>
      </div>
      <span class="logo-text">JemaChess</span>
    `;
    sidebarHeader.appendChild(logoSection);

    sidebar.appendChild(sidebarHeader);

    // User profile section (clickable to edit)
    const userSection = document.createElement('div');
    userSection.className = 'sidebar-user';
    userSection.style.cursor = 'pointer';
    userSection.title = 'Cliquez pour modifier votre pseudo';
    
    // Get stored user data
    const userData = this.getUserData();
    
    userSection.innerHTML = `
      <div class="user-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div class="user-info">
        <span class="user-name">${userData.username}</span>
        <span class="user-rating">${userData.elo} ELO</span>
      </div>
      <div class="edit-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
    `;
    
    // Add click handler for editing profile
    userSection.addEventListener('click', () => this.showEditProfileModal());
    
    sidebar.appendChild(userSection);

    // Quick stats cards
    const quickStats = document.createElement('div');
    quickStats.className = 'sidebar-stats';
    quickStats.innerHTML = `
      <div class="quick-stat">
        <span class="quick-stat-value">${this.gameStats.gamesCreated}</span>
        <span class="quick-stat-label">Parties</span>
      </div>
      <div class="quick-stat">
        <span class="quick-stat-value">${this.gameStats.totalMoves}</span>
        <span class="quick-stat-label">Coups</span>
      </div>
    `;
    sidebar.appendChild(quickStats);

    // Navigation
    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';

    const navItems = this.getNavItems();
    navItems.forEach(item => {
      const navItemWrapper = document.createElement('div');
      navItemWrapper.className = 'nav-item-wrapper';
      
      const navItem = document.createElement('button');
      navItem.className = `nav-item ${item.active ? 'active' : ''}`;
      navItem.dataset.navId = item.id;
      navItem.dataset.hasSubmenu = item.hasSubmenu ? 'true' : 'false';
      navItem.innerHTML = `
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${item.hasSubmenu ? `<span class="nav-arrow">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </span>` : ''}
      `;
      navItemWrapper.appendChild(navItem);
      nav.appendChild(navItemWrapper);
    });

    sidebar.appendChild(nav);

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'sidebar-spacer';
    sidebar.appendChild(spacer);

    // Bottom section - Minimal
    const bottomSection = document.createElement('div');
    bottomSection.className = 'sidebar-bottom';

    // Settings link
    const settingsLink = document.createElement('button');
    settingsLink.className = 'sidebar-link';
    settingsLink.dataset.action = 'settings';
    settingsLink.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
      <span>Réglages</span>
    `;
    bottomSection.appendChild(settingsLink);

    // Footer credits
    const footerCredits = document.createElement('div');
    footerCredits.className = 'sidebar-footer';
    footerCredits.innerHTML = `
      <p class="footer-text">Développé par <a href="https://www.jematechnology.fr/" target="_blank" rel="noopener noreferrer" class="jema-link">Jema Technology</a></p>
      <p class="footer-year">© 2025 • Open Source & Libre</p>
    `;
    bottomSection.appendChild(footerCredits);

    sidebar.appendChild(bottomSection);

    return sidebar;
  }

  /**
   * Create the main content area
   */
  private createMainContent(): HTMLElement {
    const main = document.createElement('main');
    main.className = 'landing-main';

    // Hero section
    const hero = document.createElement('section');
    hero.className = 'landing-hero';

    // Hero content - Centered, minimal
    const heroContent = document.createElement('div');
    heroContent.className = 'hero-content';
    heroContent.innerHTML = `
      <h1 class="hero-title">Jouez aux échecs</h1>
      <p class="hero-subtitle">Rejoignez des milliers d'utilisateurs de JemaChess</p>
      <div class="hero-actions">
        <button class="hero-cta primary" data-action="get-started">
          <span>Nouvelle partie</span>
        </button>
      </div>
    `;
    hero.appendChild(heroContent);

    // Feature cards grid
    const features = document.createElement('div');
    features.className = 'hero-features';
    features.innerHTML = `
      <div class="feature-card" data-action="play-ai">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-9 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM8 16h8v2H8v-2z"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Contre l'IA</h3>
          <p>4 niveaux de difficulté</p>
        </div>
      </div>
      <div class="feature-card" data-action="play-friend">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Avec un ami</h3>
          <p>Sur le même appareil</p>
        </div>
      </div>
      <div class="feature-card" data-action="play-online">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>En ligne</h3>
          <p>Joueurs du monde entier</p>
        </div>
      </div>
      <div class="feature-card" data-action="play-coach">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
          </svg>
        </div>
        <div class="feature-content">
          <h3>Mode Coach</h3>
          <p>Avec indices et conseils</p>
        </div>
      </div>
    `;
    hero.appendChild(features);

    main.appendChild(hero);

    return main;
  }

  /**
   * Get the hero pieces SVG HTML
   */
  private getHeroPiecesHTML(): string {
    return `
      <svg class="hero-pieces-svg" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Board hint at bottom -->
        <defs>
          <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(107, 111, 219, 0.3)"/>
            <stop offset="100%" style="stop-color:rgba(107, 111, 219, 0.1)"/>
          </linearGradient>
          <linearGradient id="pieceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8b8fe8"/>
            <stop offset="100%" style="stop-color:#6b6fdb"/>
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Board squares hint -->
        <g opacity="0.5">
          <rect x="80" y="320" width="60" height="60" fill="rgba(255,255,255,0.1)"/>
          <rect x="140" y="320" width="60" height="60" fill="rgba(107, 111, 219, 0.2)"/>
          <rect x="200" y="320" width="60" height="60" fill="rgba(255,255,255,0.1)"/>
          <rect x="260" y="320" width="60" height="60" fill="rgba(107, 111, 219, 0.2)"/>
        </g>
        
        <!-- King (back left) -->
        <g transform="translate(60, 80)" opacity="0.6" filter="url(#shadow)">
          <path d="M50 20V10M45 15h10M30 90h40M25 85l5-25h40l5 25M35 60c0-15 10-25 15-30 5 5 15 15 15 30M35 60h30" 
                stroke="url(#pieceGradient)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        
        <!-- Knight (back right) -->
        <g transform="translate(240, 70)" opacity="0.6" filter="url(#shadow)">
          <path d="M25 90h50M30 85l5-20M70 85l-5-20M35 65c0-20 5-35 20-45 5 0 10 5 10 10-5 5-5 15 0 20 10-5 15 0 15 10 0 15-15 25-30 25" 
                stroke="url(#pieceGradient)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        
        <!-- Pawn (front center) - Main piece with glow -->
        <g transform="translate(140, 140)" filter="url(#glow)">
          <path d="M60 40c0-16.569-13.431-30-30-30C13.431 10 0 23.431 0 40c0 10 5 19 13 25l-3 35h40l-3-35c8-6 13-15 13-25z" 
                fill="url(#pieceGradient)"/>
          <path d="M10 120h100M15 115l5-15h80l5 15" 
                stroke="url(#pieceGradient)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"
                transform="translate(-25, 30)"/>
          <ellipse cx="60" cy="40" rx="20" ry="20" fill="rgba(255,255,255,0.2)"/>
        </g>
        
        <!-- Decorative circles -->
        <circle cx="50" cy="350" r="5" fill="rgba(107, 111, 219, 0.4)"/>
        <circle cx="350" cy="100" r="8" fill="rgba(107, 111, 219, 0.3)"/>
        <circle cx="320" cy="350" r="6" fill="rgba(107, 111, 219, 0.5)"/>
      </svg>
    `;
  }

  /**
   * Create mobile menu button
   */
  private createMobileMenuButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    `;
    return btn;
  }

  /**
   * Create submenu panel
   */
  private createSubmenu(navId: string, anchorElement: HTMLElement): void {
    // Remove existing submenu
    this.closeSubmenu();
    
    if (navId !== 'play') return;
    
    const items = this.getPlaySubmenuItems();
    
    this.submenuElement = document.createElement('div');
    this.submenuElement.className = 'nav-submenu';
    
    const submenuContent = document.createElement('div');
    submenuContent.className = 'submenu-content';
    
    items.forEach(item => {
      const submenuItem = document.createElement('button');
      submenuItem.className = 'submenu-item';
      submenuItem.dataset.submenuId = item.id;
      submenuItem.innerHTML = `
        <span class="submenu-icon">${item.icon}</span>
        <span class="submenu-label">${item.label}</span>
      `;
      submenuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleSubmenuClick(item.id);
      });
      submenuContent.appendChild(submenuItem);
    });
    
    this.submenuElement.appendChild(submenuContent);
    
    // Append to page element for proper fixed positioning
    if (this.pageElement) {
      this.pageElement.appendChild(this.submenuElement);
    }
    
    // Position the submenu based on the nav item position
    const rect = anchorElement.getBoundingClientRect();
    this.submenuElement.style.top = `${rect.top}px`;
    
    this.activeSubmenu = navId;
    
    // Add animation class after a frame
    requestAnimationFrame(() => {
      this.submenuElement?.classList.add('open');
    });
  }

  /**
   * Close submenu
   */
  private closeSubmenu(): void {
    if (this.submenuElement) {
      this.submenuElement.classList.remove('open');
      setTimeout(() => {
        this.submenuElement?.remove();
        this.submenuElement = null;
      }, 200);
    }
    this.activeSubmenu = null;
  }

  /**
   * Handle submenu item click
   */
  private handleSubmenuClick(itemId: string): void {
    this.closeSubmenu();
    this.closeMobileMenu();
    
    switch (itemId) {
      case 'play-bots':
        if (this.onPlayVsBots) this.onPlayVsBots();
        break;
      case 'play-coach':
        if (this.onPlayWithCoach) this.onPlayWithCoach();
        break;
      case 'play-online':
        if (this.onPlayOnline) this.onPlayOnline();
        break;
      case 'play-local':
        if (this.onPlayLocal) this.onPlayLocal();
        break;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.pageElement) return;

    // Navigation items
    const navItems = this.pageElement.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const navId = (item as HTMLElement).dataset.navId;
        const hasSubmenu = (item as HTMLElement).dataset.hasSubmenu === 'true';
        
        if (hasSubmenu) {
          e.stopPropagation();
          if (this.activeSubmenu === navId) {
            this.closeSubmenu();
          } else {
            this.createSubmenu(navId || '', item as HTMLElement);
          }
        } else {
          this.handleNavClick(navId || '');
          this.closeSubmenu();
          // Close mobile menu
          this.closeMobileMenu();
        }
        
        // Update active state
        navItems.forEach(ni => ni.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // Get Started button
    const getStartedBtn = this.pageElement.querySelector('[data-action="get-started"]');
    getStartedBtn?.addEventListener('click', () => {
      if (this.onGetStarted) {
        this.onGetStarted();
      }
    });

    // Play Now link
    const playNowBtn = this.pageElement.querySelector('[data-action="play"]');
    playNowBtn?.addEventListener('click', () => {
      if (this.onPlay) {
        this.onPlay();
      }
    });

    // Social/Community link
    const socialBtn = this.pageElement.querySelector('[data-action="social"]');
    socialBtn?.addEventListener('click', () => {
      if (this.onSocial) {
        this.onSocial();
      }
    });

    // Settings link
    const settingsBtn = this.pageElement.querySelector('[data-action="settings"]');
    settingsBtn?.addEventListener('click', () => {
      if (this.onSettings) {
        this.onSettings();
      }
    });

    // Feature cards - Play AI
    const playAiCard = this.pageElement.querySelector('[data-action="play-ai"]');
    playAiCard?.addEventListener('click', () => {
      if (this.onPlayVsBots) {
        this.onPlayVsBots();
      }
    });

    // Feature cards - Play with Friend
    const playFriendCard = this.pageElement.querySelector('[data-action="play-friend"]');
    playFriendCard?.addEventListener('click', () => {
      if (this.onPlayLocal) {
        this.onPlayLocal();
      }
    });

    // Feature cards - Play Online
    const playOnlineCard = this.pageElement.querySelector('[data-action="play-online"]');
    playOnlineCard?.addEventListener('click', () => {
      if (this.onPlayOnline) {
        this.onPlayOnline();
      }
    });

    // Feature cards - Play with Coach
    const playCoachCard = this.pageElement.querySelector('[data-action="play-coach"]');
    playCoachCard?.addEventListener('click', () => {
      if (this.onPlayWithCoach) {
        this.onPlayWithCoach();
      }
    });

    // Mobile menu button
    const mobileMenuBtn = this.pageElement.querySelector('.mobile-menu-btn');
    mobileMenuBtn?.addEventListener('click', () => {
      this.toggleMobileMenu();
    });

    // Close mobile menu on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }

  /**
   * Handle navigation click
   */
  private handleNavClick(navId: string): void {
    switch (navId) {
      case 'play':
        if (this.onPlay) this.onPlay();
        break;
      case 'learn':
        if (this.onLearn) this.onLearn();
        break;
      case 'social':
        if (this.onSocial) this.onSocial();
        break;
    }
  }

  /**
   * Toggle sidebar collapsed state
   */
  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const sidebar = this.pageElement?.querySelector('.landing-sidebar');
    const collapseBtn = this.pageElement?.querySelector('.sidebar-collapse-btn');
    
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    }
    if (collapseBtn) {
      collapseBtn.classList.toggle('collapsed', this.sidebarCollapsed);
    }
    if (this.pageElement) {
      this.pageElement.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
    }
    
    // Close submenu when collapsing
    if (this.sidebarCollapsed) {
      this.closeSubmenu();
    }
  }

  /**
   * Toggle mobile menu
   */
  private toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    const sidebar = this.pageElement?.querySelector('.landing-sidebar');
    const menuBtn = this.pageElement?.querySelector('.mobile-menu-btn');
    
    if (sidebar) {
      sidebar.classList.toggle('open', this.mobileMenuOpen);
    }
    if (menuBtn) {
      menuBtn.classList.toggle('active', this.mobileMenuOpen);
    }
  }

  /**
   * Close mobile menu
   */
  private closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    const sidebar = this.pageElement?.querySelector('.landing-sidebar');
    const menuBtn = this.pageElement?.querySelector('.mobile-menu-btn');
    
    if (sidebar) {
      sidebar.classList.remove('open');
    }
    if (menuBtn) {
      menuBtn.classList.remove('active');
    }
  }

  /**
   * Shows the landing page
   */
  show(): void {
    if (!this.pageElement) {
      this.render();
    }
    if (this.pageElement) {
      this.pageElement.style.display = 'grid';
    }
  }

  /**
   * Hides the landing page
   */
  hide(): void {
    if (this.pageElement) {
      this.pageElement.style.display = 'none';
    }
  }

  /**
   * Destroys the landing page
   */
  destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    this.closeSubmenu();
    if (this.pageElement) {
      this.pageElement.remove();
      this.pageElement = null;
    }
  }
}