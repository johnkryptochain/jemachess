/**
 * Game Over Modal Component
 * 
 * Displays when checkmate or other game-ending conditions occur.
 * Offers options to restart the game or quit.
 */

import { GameStatus } from '../../types';

/**
 * GameOverModal class for handling game end display
 */
export class GameOverModal {
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  
  public onRestart: (() => void) | null = null;
  public onQuit: (() => void) | null = null;
  
  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }
  
  /**
   * Shows the game over modal
   * @param status The game status indicating how the game ended
   * @param container Optional container element to append the modal to (for fullscreen support)
   */
  show(status: GameStatus, container?: HTMLElement): void {
    this.createModal(status);
    
    // Append to provided container (for fullscreen support) or document.body as fallback
    const targetContainer = container || document.body;
    if (this.overlay) {
      targetContainer.appendChild(this.overlay);
    }
    
    // Add keyboard listener
    document.addEventListener('keydown', this.boundHandleKeyDown);
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add('active');
    });
  }
  
  /**
   * Hides the modal
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
      }, 200);
    }
    
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }
  
  /**
   * Creates the modal element
   */
  private createModal(status: GameStatus): void {
    const title = this.getTitle(status);
    const subtitle = this.getSubtitle(status);
    const icon = this.getIcon(status);
    const stateClass = this.getStateClass(status);
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = `modal-overlay game-over-modal ${stateClass}`;
    
    // Create modal content
    this.modal = document.createElement('div');
    this.modal.className = 'modal-content game-over-content';
    
    this.modal.innerHTML = `
      <div class="game-over-icon">${icon}</div>
      <h2 class="game-over-title">${title}</h2>
      <p class="game-over-subtitle">${subtitle}</p>
      <div class="game-over-actions">
        <button class="glass-button primary large restart-btn">
          <span class="button-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </span>
          Relancer la partie
        </button>
        <button class="glass-button secondary large quit-btn">
          <span class="button-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          Quitter
        </button>
      </div>
    `;
    
    // Add event listeners to buttons
    const restartBtn = this.modal.querySelector('.restart-btn');
    const quitBtn = this.modal.querySelector('.quit-btn');
    
    restartBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleRestart();
    });
    
    quitBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleQuit();
    });
    
    this.overlay.appendChild(this.modal);
  }
  
  /**
   * Gets the title based on game status
   */
  private getTitle(status: GameStatus): string {
    switch (status) {
      case GameStatus.WHITE_WINS_CHECKMATE:
      case GameStatus.BLACK_WINS_CHECKMATE:
        return 'Échec et Mat !';
      case GameStatus.WHITE_WINS_RESIGNATION:
      case GameStatus.BLACK_WINS_RESIGNATION:
        return 'Abandon';
      case GameStatus.WHITE_WINS_TIMEOUT:
      case GameStatus.BLACK_WINS_TIMEOUT:
        return 'Temps écoulé';
      case GameStatus.DRAW_STALEMATE:
        return 'Pat';
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
      case GameStatus.DRAW_THREEFOLD_REPETITION:
      case GameStatus.DRAW_FIFTY_MOVES:
      case GameStatus.DRAW_AGREEMENT:
        return 'Match nul';
      default:
        return 'Partie terminée';
    }
  }
  
  /**
   * Gets the subtitle based on game status
   */
  private getSubtitle(status: GameStatus): string {
    switch (status) {
      case GameStatus.WHITE_WINS_CHECKMATE:
        return 'Les Blancs gagnent - Le roi noir est capturé !';
      case GameStatus.BLACK_WINS_CHECKMATE:
        return 'Les Noirs gagnent - Le roi blanc est capturé !';
      case GameStatus.WHITE_WINS_RESIGNATION:
        return 'Les Noirs ont abandonné';
      case GameStatus.BLACK_WINS_RESIGNATION:
        return 'Les Blancs ont abandonné';
      case GameStatus.WHITE_WINS_TIMEOUT:
        return 'Les Noirs ont épuisé leur temps';
      case GameStatus.BLACK_WINS_TIMEOUT:
        return 'Les Blancs ont épuisé leur temps';
      case GameStatus.DRAW_STALEMATE:
        return 'Aucun coup légal possible';
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
        return 'Matériel insuffisant pour mater';
      case GameStatus.DRAW_THREEFOLD_REPETITION:
        return 'Triple répétition de position';
      case GameStatus.DRAW_FIFTY_MOVES:
        return 'Règle des 50 coups';
      case GameStatus.DRAW_AGREEMENT:
        return 'Les joueurs ont accepté la nulle';
      default:
        return '';
    }
  }
  
  /**
   * Gets the icon based on game status
   */
  private getIcon(status: GameStatus): string {
    switch (status) {
      case GameStatus.WHITE_WINS_CHECKMATE:
      case GameStatus.BLACK_WINS_CHECKMATE:
        return '👑';
      case GameStatus.WHITE_WINS_RESIGNATION:
      case GameStatus.BLACK_WINS_RESIGNATION:
        return '🏳️';
      case GameStatus.WHITE_WINS_TIMEOUT:
      case GameStatus.BLACK_WINS_TIMEOUT:
        return '⏰';
      case GameStatus.DRAW_STALEMATE:
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
      case GameStatus.DRAW_THREEFOLD_REPETITION:
      case GameStatus.DRAW_FIFTY_MOVES:
      case GameStatus.DRAW_AGREEMENT:
        return '🤝';
      default:
        return '🎮';
    }
  }
  
  /**
   * Gets the state class for styling based on game status
   */
  private getStateClass(status: GameStatus): string {
    switch (status) {
      case GameStatus.WHITE_WINS_CHECKMATE:
      case GameStatus.WHITE_WINS_RESIGNATION:
      case GameStatus.WHITE_WINS_TIMEOUT:
      case GameStatus.BLACK_WINS_CHECKMATE:
      case GameStatus.BLACK_WINS_RESIGNATION:
      case GameStatus.BLACK_WINS_TIMEOUT:
        return 'win';
      case GameStatus.DRAW_STALEMATE:
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
      case GameStatus.DRAW_THREEFOLD_REPETITION:
      case GameStatus.DRAW_FIFTY_MOVES:
      case GameStatus.DRAW_AGREEMENT:
        return 'draw';
      default:
        return '';
    }
  }
  
  /**
   * Handles keyboard input
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.handleRestart();
        break;
      case 'Escape':
        event.preventDefault();
        this.handleQuit();
        break;
    }
  }
  
  /**
   * Handles restart action
   */
  private handleRestart(): void {
    if (this.onRestart) {
      this.onRestart();
    }
    this.hide();
  }
  
  /**
   * Handles quit action
   */
  private handleQuit(): void {
    if (this.onQuit) {
      this.onQuit();
    }
    this.hide();
  }
}

/**
 * Singleton instance for easy access
 */
let gameOverModalInstance: GameOverModal | null = null;

/**
 * Gets the singleton game over modal instance
 */
export function getGameOverModal(): GameOverModal {
  if (!gameOverModalInstance) {
    gameOverModalInstance = new GameOverModal();
  }
  return gameOverModalInstance;
}