/**
 * Settings Panel Component
 * 
 * Provides a settings panel for configuring game options
 * like piece theme, sound, and display preferences.
 */

import { PieceTheme } from '../../types';
import { PieceRenderer } from './Piece';

/**
 * Game settings interface
 */
export interface GameSettings {
  pieceTheme: PieceTheme;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  autoQueen: boolean;
}

/**
 * Default game settings
 */
export const DEFAULT_SETTINGS: GameSettings = {
  pieceTheme: PieceTheme.CLASSIC,
  soundEnabled: true,
  showLegalMoves: true,
  showCoordinates: true,
  autoQueen: false,
};

/**
 * Settings class for the settings panel
 */
export class Settings {
  private container: HTMLElement;
  private settingsElement: HTMLElement | null = null;
  private settings: GameSettings;

  // Event callbacks
  public onSettingsChange: ((settings: GameSettings) => void) | null = null;
  public onClose: (() => void) | null = null;

  constructor(container: HTMLElement, initialSettings?: Partial<GameSettings>) {
    this.container = container;
    this.settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  }

  /**
   * Renders the settings panel
   */
  render(): void {
    this.container.innerHTML = '';

    this.settingsElement = document.createElement('div');
    this.settingsElement.className = 'settings-panel glass-card';

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';

    const backButton = document.createElement('button');
    backButton.className = 'settings-back';
    backButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    `;
    backButton.addEventListener('click', () => {
      if (this.onClose) {
        this.onClose();
      }
    });
    header.appendChild(backButton);

    const title = document.createElement('h2');
    title.className = 'settings-title';
    title.textContent = 'Paramètres';
    header.appendChild(title);

    this.settingsElement.appendChild(header);

    // Appearance Section
    const appearanceSection = this.createSection('Apparence');
    
    // Piece Theme
    const themeOption = document.createElement('div');
    themeOption.className = 'settings-section';
    
    const themeLabel = document.createElement('div');
    themeLabel.className = 'settings-label';
    themeLabel.textContent = 'Thème des pièces';
    themeOption.appendChild(themeLabel);

    const themeSelector = this.createThemeSelector();
    themeOption.appendChild(themeSelector);
    
    appearanceSection.appendChild(themeOption);

    // Show Coordinates toggle
    appearanceSection.appendChild(
      this.createToggleOption(
        'Afficher les coordonnées',
        'Afficher les lettres et chiffres sur l\'échiquier',
        this.settings.showCoordinates,
        (value) => {
          this.settings.showCoordinates = value;
          this.notifyChange();
        }
      )
    );

    // Show Legal Moves toggle
    appearanceSection.appendChild(
      this.createToggleOption(
        'Afficher les coups légaux',
        'Mettre en surbrillance les coups possibles',
        this.settings.showLegalMoves,
        (value) => {
          this.settings.showLegalMoves = value;
          this.notifyChange();
        }
      )
    );

    this.settingsElement.appendChild(appearanceSection);

    // Gameplay Section
    const gameplaySection = this.createSection('Gameplay');

    // Auto Queen toggle
    gameplaySection.appendChild(
      this.createToggleOption(
        'Promotion automatique',
        'Promouvoir automatiquement les pions en dame',
        this.settings.autoQueen,
        (value) => {
          this.settings.autoQueen = value;
          this.notifyChange();
        }
      )
    );

    this.settingsElement.appendChild(gameplaySection);

    // Sound Section
    const soundSection = this.createSection('Son');

    // Sound Enabled toggle
    soundSection.appendChild(
      this.createToggleOption(
        'Effets sonores',
        'Jouer des sons pour les coups et événements',
        this.settings.soundEnabled,
        (value) => {
          this.settings.soundEnabled = value;
          this.notifyChange();
        }
      )
    );

    this.settingsElement.appendChild(soundSection);

    this.container.appendChild(this.settingsElement);
  }

  /**
   * Creates a settings section
   */
  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'settings-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    return section;
  }

  /**
   * Creates a toggle option
   */
  private createToggleOption(
    label: string,
    description: string,
    initialValue: boolean,
    onChange: (value: boolean) => void
  ): HTMLElement {
    const option = document.createElement('div');
    option.className = 'settings-option';

    const labelContainer = document.createElement('div');
    
    const labelElement = document.createElement('div');
    labelElement.className = 'settings-label';
    labelElement.textContent = label;
    labelContainer.appendChild(labelElement);

    const descElement = document.createElement('div');
    descElement.className = 'settings-description';
    descElement.textContent = description;
    labelContainer.appendChild(descElement);

    option.appendChild(labelContainer);

    const toggle = document.createElement('div');
    toggle.className = `glass-toggle ${initialValue ? 'active' : ''}`;
    toggle.addEventListener('click', () => {
      const newValue = !toggle.classList.contains('active');
      toggle.classList.toggle('active', newValue);
      onChange(newValue);
    });
    option.appendChild(toggle);

    return option;
  }

  /**
   * Creates the theme selector
   */
  private createThemeSelector(): HTMLElement {
    const selector = document.createElement('div');
    selector.className = 'piece-set-selector';

    const themes: { theme: PieceTheme; name: string }[] = [
      { theme: PieceTheme.CLASSIC, name: 'Classique' },
      { theme: PieceTheme.EGYPTIAN, name: 'Égyptien' },
      { theme: PieceTheme.VIKING, name: 'Viking' },
      { theme: PieceTheme.GREEK, name: 'Grec' },
    ];

    for (const { theme, name } of themes) {
      const option = document.createElement('div');
      option.className = `piece-set-option ${this.settings.pieceTheme === theme ? 'selected' : ''}`;
      option.dataset.theme = theme;

      // Preview with king and queen
      const preview = document.createElement('div');
      preview.className = 'piece-set-preview';

      const whiteKing = PieceRenderer.createElement(
        { type: 'k' as any, color: 'w' as any },
        theme
      );
      whiteKing.style.width = '28px';
      whiteKing.style.height = '28px';
      preview.appendChild(whiteKing);

      const blackQueen = PieceRenderer.createElement(
        { type: 'q' as any, color: 'b' as any },
        theme
      );
      blackQueen.style.width = '28px';
      blackQueen.style.height = '28px';
      preview.appendChild(blackQueen);

      option.appendChild(preview);

      const nameElement = document.createElement('div');
      nameElement.className = 'piece-set-name';
      nameElement.textContent = name;
      option.appendChild(nameElement);

      option.addEventListener('click', () => {
        // Update selection
        selector.querySelectorAll('.piece-set-option').forEach((el) => {
          el.classList.remove('selected');
        });
        option.classList.add('selected');

        this.settings.pieceTheme = theme;
        this.notifyChange();
      });

      selector.appendChild(option);
    }

    return selector;
  }

  /**
   * Notifies listeners of settings change
   */
  private notifyChange(): void {
    if (this.onSettingsChange) {
      this.onSettingsChange({ ...this.settings });
    }
    
    // Save to localStorage
    this.saveSettings();
  }

  /**
   * Gets the current settings
   */
  getSettings(): GameSettings {
    return { ...this.settings };
  }

  /**
   * Updates settings
   */
  setSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (this.settingsElement) {
      this.render();
    }
  }

  /**
   * Saves settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('chess-settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }

  /**
   * Loads settings from localStorage
   */
  static loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem('chess-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Shows the settings panel
   */
  show(): void {
    if (!this.settingsElement) {
      this.render();
    }
    if (this.settingsElement) {
      this.settingsElement.style.display = 'block';
    }
  }

  /**
   * Hides the settings panel
   */
  hide(): void {
    if (this.settingsElement) {
      this.settingsElement.style.display = 'none';
    }
  }

  /**
   * Destroys the settings panel
   */
  destroy(): void {
    if (this.settingsElement) {
      this.settingsElement.remove();
      this.settingsElement = null;
    }
  }
}