/**
 * Main Menu Component
 *
 * The main menu screen with options to play online, play locally,
 * play against computer, or access settings.
 */

import { AIDifficulty } from '../../engine';

/**
 * Game mode types
 */
export type GameMode = 'online' | 'local' | 'computer' | 'coach';

/**
 * MainMenu class for the main menu screen
 */
export class MainMenu {
  private container: HTMLElement;
  private menuElement: HTMLElement | null = null;

  // Event callbacks
  public onPlayOnline: (() => void) | null = null;
  public onPlayLocal: (() => void) | null = null;
  public onPlayComputer: ((difficulty: AIDifficulty) => void) | null = null;
  public onPlayCoach: (() => void) | null = null;
  public onSettings: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Renders the main menu
   */
  render(): void {
    this.container.innerHTML = '';

    this.menuElement = document.createElement('div');
    this.menuElement.className = 'main-menu';

    // Logo/Title section
    const logoSection = document.createElement('div');
    logoSection.className = 'menu-logo-section';

    // Chess piece icon as logo
    const logo = document.createElement('div');
    logo.className = 'menu-logo';
    logo.innerHTML = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10C45 10 40 15 40 20C40 25 42 28 45 30L43 45H35C33 45 31 47 31 49V53C31 55 33 57 35 57H38L36 75H30C28 75 26 77 26 79V85C26 87 28 89 30 89H70C72 89 74 87 74 85V79C74 77 72 75 70 75H64L62 57H65C67 57 69 55 69 53V49C69 47 67 45 65 45H57L55 30C58 28 60 25 60 20C60 15 55 10 50 10Z" fill="currentColor"/>
      </svg>
    `;
    logoSection.appendChild(logo);

    // Title
    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = 'Chess';
    logoSection.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'menu-subtitle';
    subtitle.textContent = 'Play chess with friends online';
    logoSection.appendChild(subtitle);

    this.menuElement.appendChild(logoSection);

    // Menu buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'menu-buttons';

    // Play vs Computer button (primary action)
    const playComputerBtn = document.createElement('button');
    playComputerBtn.className = 'glass-button primary menu-button';
    playComputerBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/>
        <line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/>
        <line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/>
        <line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
      Play vs Computer
    `;
    playComputerBtn.addEventListener('click', () => {
      this.showDifficultySelector();
    });
    buttonsContainer.appendChild(playComputerBtn);

    // Play with Coach button
    const playCoachBtn = document.createElement('button');
    playCoachBtn.className = 'glass-button secondary menu-button';
    playCoachBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      Play with Coach
      <span class="badge">Hints</span>
    `;
    playCoachBtn.addEventListener('click', () => {
      if (this.onPlayCoach) {
        this.onPlayCoach();
      }
    });
    buttonsContainer.appendChild(playCoachBtn);

    // Play Online button
    const playOnlineBtn = document.createElement('button');
    playOnlineBtn.className = 'glass-button secondary menu-button';
    playOnlineBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Play Online
    `;
    playOnlineBtn.addEventListener('click', () => {
      if (this.onPlayOnline) {
        this.onPlayOnline();
      }
    });
    buttonsContainer.appendChild(playOnlineBtn);

    // Play Local button
    const playLocalBtn = document.createElement('button');
    playLocalBtn.className = 'glass-button secondary menu-button';
    playLocalBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      Play with Friend
    `;
    playLocalBtn.addEventListener('click', () => {
      if (this.onPlayLocal) {
        this.onPlayLocal();
      }
    });
    buttonsContainer.appendChild(playLocalBtn);

    // Settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'glass-button tertiary menu-button';
    settingsBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      Settings
    `;
    settingsBtn.addEventListener('click', () => {
      if (this.onSettings) {
        this.onSettings();
      }
    });
    buttonsContainer.appendChild(settingsBtn);

    this.menuElement.appendChild(buttonsContainer);

    // Add styles for new elements
    this.addStyles();

    // Footer
    const footer = document.createElement('div');
    footer.className = 'menu-footer';
    footer.textContent = 'Built with WebRTC for peer-to-peer gameplay';
    this.menuElement.appendChild(footer);

    this.container.appendChild(this.menuElement);
  }

  /**
   * Add additional styles for new menu elements
   */
  private addStyles(): void {
    const styleId = 'main-menu-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .menu-button .badge {
        display: inline-block;
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        margin-left: 8px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .glass-button.tertiary {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .glass-button.tertiary:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .difficulty-modal {
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
      
      .difficulty-modal-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
      }
      
      .difficulty-modal h3 {
        margin: 0 0 24px 0;
        text-align: center;
        color: #fff;
      }
      
      .difficulty-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .difficulty-option {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        color: #fff;
      }
      
      .difficulty-option:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      .difficulty-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(125, 130, 234, 0.15);
        border-radius: 12px;
        flex-shrink: 0;
      }
      
      .difficulty-icon .star-rating {
        color: #7d82ea;
        font-size: 14px;
        letter-spacing: 2px;
      }
      
      .difficulty-option[data-difficulty="easy"] .star-rating {
        font-size: 20px;
      }
      
      .difficulty-option[data-difficulty="medium"] .star-rating {
        font-size: 16px;
      }
      
      .difficulty-option[data-difficulty="hard"] .star-rating {
        font-size: 14px;
      }
      
      .difficulty-option[data-difficulty="master"] .star-rating {
        font-size: 12px;
        color: #ffd700;
      }
      
      .difficulty-option .info {
        flex: 1;
      }
      
      .difficulty-option .name {
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .difficulty-option .rating {
        font-size: 12px;
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show difficulty selector modal
   */
  private showDifficultySelector(): void {
    const modal = document.createElement('div');
    modal.className = 'difficulty-modal';
    modal.innerHTML = `
      <div class="difficulty-modal-content">
        <h3>Select Difficulty</h3>
        <div class="difficulty-options">
          <div class="difficulty-option" data-difficulty="easy">
            <div class="difficulty-icon">
              <span class="star-rating">★</span>
            </div>
            <div class="info">
              <div class="name">Easy</div>
              <div class="rating">Rating ~800</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="medium">
            <div class="difficulty-icon">
              <span class="star-rating">★★</span>
            </div>
            <div class="info">
              <div class="name">Medium</div>
              <div class="rating">Rating ~1200</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="hard">
            <div class="difficulty-icon">
              <span class="star-rating">★★★</span>
            </div>
            <div class="info">
              <div class="name">Hard</div>
              <div class="rating">Rating ~1600</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="master">
            <div class="difficulty-icon">
              <span class="star-rating master">★★★★</span>
            </div>
            <div class="info">
              <div class="name">Master</div>
              <div class="rating">Rating ~2000</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Handle option clicks
    const options = modal.querySelectorAll('.difficulty-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const difficulty = option.getAttribute('data-difficulty') as AIDifficulty;
        modal.remove();
        if (this.onPlayComputer) {
          this.onPlayComputer(difficulty);
        }
      });
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  /**
   * Shows the main menu
   */
  show(): void {
    if (!this.menuElement) {
      this.render();
    }
    if (this.menuElement) {
      this.menuElement.style.display = 'flex';
    }
  }

  /**
   * Hides the main menu
   */
  hide(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
  }

  /**
   * Destroys the main menu
   */
  destroy(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
  }
}