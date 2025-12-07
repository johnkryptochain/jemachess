/**
 * Difficulty Selector Component
 * 
 * Allows users to select AI difficulty level when playing against the computer.
 * Displays difficulty options with descriptions and visual indicators.
 */

import { AIDifficulty } from '../../engine';

/**
 * Difficulty option configuration
 */
interface DifficultyOption {
  id: AIDifficulty;
  name: string;
  description: string;
  rating: string;
  icon: string;
  color: string;
}

/**
 * Available difficulty options
 */
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: 'easy',
    name: 'Easy',
    description: 'Perfect for beginners. Makes occasional mistakes.',
    rating: '~800',
    icon: `<span class="star-rating">★</span>`,
    color: '#7d82ea',
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'A balanced challenge. Plays solid moves.',
    rating: '~1200',
    icon: `<span class="star-rating">★★</span>`,
    color: '#7d82ea',
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Strong play. Finds tactical combinations.',
    rating: '~1600',
    icon: `<span class="star-rating">★★★</span>`,
    color: '#7d82ea',
  },
  {
    id: 'master',
    name: 'Master',
    description: 'Expert level. Deep calculation and strategy.',
    rating: '~2000',
    icon: `<span class="star-rating master">★★★★</span>`,
    color: '#ffd700',
  },
];

/**
 * DifficultySelector class
 */
export class DifficultySelector {
  private container: HTMLElement;
  private selectorElement: HTMLElement | null = null;
  private selectedDifficulty: AIDifficulty = 'medium';
  private isVisible: boolean = false;

  // Callbacks
  public onSelect: ((difficulty: AIDifficulty) => void) | null = null;
  public onCancel: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Render the difficulty selector
   */
  render(): void {
    if (this.selectorElement) {
      this.selectorElement.remove();
    }

    this.selectorElement = document.createElement('div');
    this.selectorElement.className = 'difficulty-selector-overlay';
    this.selectorElement.innerHTML = `
      <div class="difficulty-selector">
        <div class="difficulty-header">
          <h2>Choose Difficulty</h2>
          <p>Select the AI strength for your game</p>
        </div>
        
        <div class="difficulty-options">
          ${DIFFICULTY_OPTIONS.map(opt => this.renderOption(opt)).join('')}
        </div>
        
        <div class="difficulty-actions">
          <button class="difficulty-btn cancel-btn">Cancel</button>
          <button class="difficulty-btn start-btn">Start Game</button>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Setup event listeners
    this.setupEventListeners();

    this.container.appendChild(this.selectorElement);
    this.isVisible = true;

    // Select default difficulty
    this.selectDifficulty(this.selectedDifficulty);
  }

  /**
   * Render a single difficulty option
   */
  private renderOption(option: DifficultyOption): string {
    return `
      <div class="difficulty-option" data-difficulty="${option.id}" style="--option-color: ${option.color}">
        <div class="difficulty-icon">${option.icon}</div>
        <div class="difficulty-info">
          <div class="difficulty-name">${option.name}</div>
          <div class="difficulty-description">${option.description}</div>
          <div class="difficulty-rating">Rating: ${option.rating}</div>
        </div>
        <div class="difficulty-check">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
    `;
  }

  /**
   * Add component styles
   */
  private addStyles(): void {
    const styleId = 'difficulty-selector-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .difficulty-selector-overlay {
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
        animation: fadeIn 0.2s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .difficulty-selector {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .difficulty-header {
        text-align: center;
        margin-bottom: 24px;
      }
      
      .difficulty-header h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #fff;
      }
      
      .difficulty-header p {
        margin: 0;
        color: #888;
        font-size: 14px;
      }
      
      .difficulty-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
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
        transition: all 0.2s ease;
      }
      
      .difficulty-option:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .difficulty-option.selected {
        background: rgba(var(--option-color-rgb, 255, 255, 255), 0.1);
        border-color: var(--option-color);
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
      
      .difficulty-option:hover .difficulty-icon {
        background: rgba(125, 130, 234, 0.25);
      }
      
      .difficulty-option.selected .difficulty-icon {
        background: rgba(125, 130, 234, 0.3);
      }
      
      .difficulty-info {
        flex: 1;
      }
      
      .difficulty-name {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }
      
      .difficulty-description {
        font-size: 13px;
        color: #888;
        margin-bottom: 4px;
      }
      
      .difficulty-rating {
        font-size: 12px;
        color: #666;
        font-family: 'Courier New', monospace;
      }
      
      .difficulty-check {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--option-color);
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
      }
      
      .difficulty-option.selected .difficulty-check {
        opacity: 1;
        transform: scale(1);
      }
      
      .difficulty-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .difficulty-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .cancel-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #888;
      }
      
      .cancel-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      
      .start-btn {
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: #fff;
      }
      
      .start-btn:hover {
        background: linear-gradient(135deg, #5cbf60 0%, #4fb053 100%);
        transform: translateY(-1px);
      }
      
      .start-btn:active {
        transform: translateY(0);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.selectorElement) return;

    // Option selection
    const options = this.selectorElement.querySelectorAll('.difficulty-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const difficulty = option.getAttribute('data-difficulty') as AIDifficulty;
        this.selectDifficulty(difficulty);
      });
    });

    // Cancel button
    const cancelBtn = this.selectorElement.querySelector('.cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onCancel) {
        this.onCancel();
      }
    });

    // Start button
    const startBtn = this.selectorElement.querySelector('.start-btn');
    startBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onSelect) {
        this.onSelect(this.selectedDifficulty);
      }
    });

    // Click outside to close
    this.selectorElement.addEventListener('click', (e) => {
      if (e.target === this.selectorElement) {
        this.hide();
        if (this.onCancel) {
          this.onCancel();
        }
      }
    });

    // Escape key to close
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        if (this.onCancel) {
          this.onCancel();
        }
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Select a difficulty
   */
  selectDifficulty(difficulty: AIDifficulty): void {
    this.selectedDifficulty = difficulty;

    if (!this.selectorElement) return;

    // Update visual selection
    const options = this.selectorElement.querySelectorAll('.difficulty-option');
    options.forEach(option => {
      const optDifficulty = option.getAttribute('data-difficulty');
      option.classList.toggle('selected', optDifficulty === difficulty);
    });
  }

  /**
   * Get the selected difficulty
   */
  getSelectedDifficulty(): AIDifficulty {
    return this.selectedDifficulty;
  }

  /**
   * Show the selector
   */
  show(): void {
    if (!this.selectorElement) {
      this.render();
    } else {
      this.selectorElement.style.display = 'flex';
    }
    this.isVisible = true;
  }

  /**
   * Hide the selector
   */
  hide(): void {
    if (this.selectorElement) {
      this.selectorElement.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Check if selector is visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the selector
   */
  destroy(): void {
    if (this.selectorElement) {
      this.selectorElement.remove();
      this.selectorElement = null;
    }
    this.isVisible = false;
  }
}

/**
 * Get difficulty display name
 */
export function getDifficultyName(difficulty: AIDifficulty): string {
  const option = DIFFICULTY_OPTIONS.find(opt => opt.id === difficulty);
  return option?.name || difficulty;
}

/**
 * Get difficulty rating
 */
export function getDifficultyRating(difficulty: AIDifficulty): string {
  const option = DIFFICULTY_OPTIONS.find(opt => opt.id === difficulty);
  return option?.rating || '?';
}