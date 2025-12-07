/**
 * Game Screen Component
 * 
 * The main game screen that displays the chess board, player info,
 * move history, and game controls.
 */

import { Board } from './Board';
import { ChessGame } from '../../engine';
import { PieceTheme, PieceColor, GameStatus, Move, PieceType } from '../../types';
import { getPromotionDialog } from './PromotionDialog';
import { Toast } from './Toast';
import { GameSettings } from './Settings';

/**
 * Formats time in mm:ss format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * GameScreen class for the main game interface
 */
export class GameScreen {
  private container: HTMLElement;
  private gameElement: HTMLElement | null = null;
  private board: Board | null = null;
  private game: ChessGame;
  private settings: GameSettings;

  // UI elements
  private whitePlayerCard: HTMLElement | null = null;
  private blackPlayerCard: HTMLElement | null = null;
  private moveHistoryPanel: HTMLElement | null = null;
  private boardContainer: HTMLElement | null = null;
  private gameOverlay: HTMLElement | null = null;
  private themeBtn: HTMLButtonElement | null = null;

  // Player info
  private whiteName: string = 'Blancs';
  private blackName: string = 'Noirs';
  private whiteTime: number = 600; // 10 minutes default
  private blackTime: number = 600;
  private timerInterval: number | null = null;
  
  // Board state
  private flipped: boolean = false;

  // Theme cycling order
  private static readonly THEME_ORDER: PieceTheme[] = [
    PieceTheme.CLASSIC,
    PieceTheme.EGYPTIAN,
    PieceTheme.VIKING,
    PieceTheme.GREEK
  ];

  // Event callbacks
  public onResign: (() => void) | null = null;
  public onOfferDraw: (() => void) | null = null;
  public onRematch: (() => void) | null = null;
  public onExit: (() => void) | null = null;
  public onMove: ((move: Move) => void) | null = null;

  constructor(container: HTMLElement, settings?: GameSettings) {
    this.container = container;
    this.game = new ChessGame();
    this.settings = settings || {
      pieceTheme: PieceTheme.CLASSIC,
      soundEnabled: true,
      showLegalMoves: true,
      showCoordinates: true,
      autoQueen: false,
    };
  }

  /**
   * Initializes the game screen
   */
  init(): void {
    this.game.reset();
    this.render();
  }

  /**
   * Renders the complete game screen
   */
  render(): void {
    this.container.innerHTML = '';

    this.gameElement = document.createElement('div');
    this.gameElement.className = 'game-container';

    // Left side panel (black player info when not flipped)
    const leftPanel = document.createElement('div');
    leftPanel.className = 'side-panel left';
    
    this.blackPlayerCard = this.createPlayerCard(PieceColor.BLACK);
    leftPanel.appendChild(this.blackPlayerCard);

    this.gameElement.appendChild(leftPanel);

    // Center - Board
    const centerSection = document.createElement('div');
    centerSection.className = 'board-container';

    this.boardContainer = document.createElement('div');
    this.boardContainer.id = 'chess-board';
    centerSection.appendChild(this.boardContainer);

    this.gameElement.appendChild(centerSection);

    // Right side panel (white player info when not flipped)
    const rightPanel = document.createElement('div');
    rightPanel.className = 'side-panel right';

    this.whitePlayerCard = this.createPlayerCard(PieceColor.WHITE);
    rightPanel.appendChild(this.whitePlayerCard);

    // Move history
    this.moveHistoryPanel = this.createMoveHistoryPanel();
    rightPanel.appendChild(this.moveHistoryPanel);

    // Game actions
    const gameActions = this.createGameActions();
    rightPanel.appendChild(gameActions);

    this.gameElement.appendChild(rightPanel);

    // Game over overlay
    this.gameOverlay = this.createGameOverlay();
    this.gameElement.appendChild(this.gameOverlay);

    this.container.appendChild(this.gameElement);

    // Initialize the board
    this.initBoard();
  }

  /**
   * Initializes the chess board
   */
  private initBoard(): void {
    if (!this.boardContainer) return;

    this.board = new Board(this.boardContainer, this.game);
    this.board.setTheme(this.settings.pieceTheme);
    this.board.setShowCoordinates(this.settings.showCoordinates);
    this.board.setShowLegalMoves(this.settings.showLegalMoves);

    // Handle promotion
    this.board.onPromotionRequired = async (from, to, color) => {
      if (this.settings.autoQueen) {
        return PieceType.QUEEN;
      }

      const boardRect = this.boardContainer!.getBoundingClientRect();
      const squareSize = boardRect.width / 8;
      const x = boardRect.left + (to.file + 0.5) * squareSize;
      const y = boardRect.top + ((7 - to.rank) + 0.5) * squareSize;

      const dialog = getPromotionDialog();
      return dialog.show(color, this.settings.pieceTheme, { x, y });
    };

    // Handle moves
    this.board.onMove = (move) => {
      this.updateMoveHistory();
      this.updatePlayerCards();
      this.updateCapturedPieces();
      this.checkGameOver();

      if (this.onMove) {
        this.onMove(move);
      }

      // Play sound if enabled
      if (this.settings.soundEnabled) {
        this.playMoveSound(move);
      }
    };

    this.board.render();
  }

  /**
   * Creates a player card element
   */
  private createPlayerCard(color: PieceColor): HTMLElement {
    const card = document.createElement('div');
    card.className = `player-card glass-card ${color === this.game.currentTurn ? 'active' : ''}`;
    card.dataset.color = color;

    const avatar = document.createElement('div');
    avatar.className = `player-avatar ${color === PieceColor.WHITE ? 'white' : 'black'}`;
    avatar.textContent = color === PieceColor.WHITE ? this.whiteName[0].toUpperCase() : this.blackName[0].toUpperCase();
    card.appendChild(avatar);

    const info = document.createElement('div');
    info.className = 'player-info';

    const name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = color === PieceColor.WHITE ? this.whiteName : this.blackName;
    info.appendChild(name);

    card.appendChild(info);

    const timer = document.createElement('div');
    timer.className = `player-timer ${color === this.game.currentTurn ? 'active' : ''}`;
    timer.textContent = formatTime(color === PieceColor.WHITE ? this.whiteTime : this.blackTime);
    card.appendChild(timer);

    return card;
  }

  /**
   * Creates the move history panel
   */
  private createMoveHistoryPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'move-history glass-card';

    const header = document.createElement('div');
    header.className = 'move-history-header';

    const title = document.createElement('div');
    title.className = 'move-history-title';
    title.textContent = 'Coups';
    header.appendChild(title);

    panel.appendChild(header);

    const movesContainer = document.createElement('div');
    movesContainer.className = 'moves-container';

    const moves = this.game.moveHistory;
    for (let i = 0; i < moves.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row';

      const moveNum = document.createElement('span');
      moveNum.className = 'move-number';
      moveNum.textContent = `${Math.floor(i / 2) + 1}.`;
      row.appendChild(moveNum);

      const whiteMove = document.createElement('span');
      whiteMove.className = `move white ${i === moves.length - 1 ? 'current' : ''}`;
      whiteMove.textContent = this.moveToNotation(moves[i]);
      row.appendChild(whiteMove);

      if (moves[i + 1]) {
        const blackMove = document.createElement('span');
        blackMove.className = `move black ${i + 1 === moves.length - 1 ? 'current' : ''}`;
        blackMove.textContent = this.moveToNotation(moves[i + 1]);
        row.appendChild(blackMove);
      }

      movesContainer.appendChild(row);
    }

    panel.appendChild(movesContainer);

    // Scroll to bottom
    requestAnimationFrame(() => {
      movesContainer.scrollTop = movesContainer.scrollHeight;
    });

    return panel;
  }

  /**
   * Converts a move to algebraic notation
   */
  private moveToNotation(move: Move): string {
    // Simplified notation - the game engine has full PGN export
    const pieceSymbols: Record<string, string> = {
      'k': 'K',
      'q': 'Q',
      'r': 'R',
      'b': 'B',
      'n': 'N',
      'p': '',
    };

    let notation = pieceSymbols[move.piece.type] || '';
    
    if (move.captured) {
      if (move.piece.type === PieceType.PAWN) {
        notation += String.fromCharCode('a'.charCodeAt(0) + move.from.file);
      }
      notation += 'x';
    }

    notation += String.fromCharCode('a'.charCodeAt(0) + move.to.file);
    notation += (move.to.rank + 1).toString();

    if (move.promotion) {
      notation += '=' + pieceSymbols[move.promotion];
    }

    if (move.isCheckmate) {
      notation += '#';
    } else if (move.isCheck) {
      notation += '+';
    }

    return notation;
  }

  /**
   * Creates game action buttons
   */
  private createGameActions(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'game-actions glass-card';

    // Top row with icon buttons
    const topRow = document.createElement('div');
    topRow.className = 'game-actions-row';

    // Theme flip button
    this.themeBtn = this.createThemeFlipButton();
    topRow.appendChild(this.themeBtn);

    // Flip board button
    const flipBtn = document.createElement('button');
    flipBtn.className = 'glass-button small icon-btn';
    flipBtn.title = 'Retourner le plateau (F)';
    flipBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    `;
    flipBtn.addEventListener('click', () => this.flipBoard());
    topRow.appendChild(flipBtn);

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'glass-button small icon-btn';
    fullscreenBtn.title = 'Plein écran';
    fullscreenBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="fullscreen-icon">
        <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
        <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
        <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
        <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
      </svg>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="exit-fullscreen-icon" style="display:none">
        <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
        <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
        <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
        <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
      </svg>
    `;
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen(fullscreenBtn));
    topRow.appendChild(fullscreenBtn);

    actions.appendChild(topRow);

    // Resign button
    const resignBtn = document.createElement('button');
    resignBtn.className = 'glass-button danger small';
    resignBtn.textContent = 'Abandonner';
    resignBtn.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir abandonner ?')) {
        this.game.resign();
        // Don't show game over overlay, directly exit to landing page
        if (this.onResign) {
          this.onResign();
        }
        // Call onExit to return to landing page
        if (this.onExit) {
          this.onExit();
        }
      }
    });
    actions.appendChild(resignBtn);

    return actions;
  }

  // Bound handler for fullscreen change
  private boundFullscreenHandler: (() => void) | null = null;

  /**
   * Toggles fullscreen mode - shows only the chess board
   */
  private toggleFullscreen(btn: HTMLButtonElement): void {
    const fullscreenIcon = btn.querySelector('.fullscreen-icon') as SVGElement;
    const exitIcon = btn.querySelector('.exit-fullscreen-icon') as SVGElement;

    if (!document.fullscreenElement) {
      // Enter fullscreen - show only the board
      const gameContainer = this.gameElement;
      if (gameContainer) {
        gameContainer.classList.add('fullscreen-mode');
        
        // Create exit button overlay
        this.createFullscreenExitButton();
        
        // Add fullscreen change listener
        this.boundFullscreenHandler = this.handleFullscreenChange.bind(this);
        document.addEventListener('fullscreenchange', this.boundFullscreenHandler);
        
        // Request fullscreen on the game container
        gameContainer.requestFullscreen().then(() => {
          if (fullscreenIcon) fullscreenIcon.style.display = 'none';
          if (exitIcon) exitIcon.style.display = 'block';
          btn.title = 'Quitter le plein écran';
          
          // Force board resize after fullscreen
          setTimeout(() => this.resizeBoardForFullscreen(), 100);
        }).catch((err) => {
          console.error('Error entering fullscreen:', err);
          gameContainer.classList.remove('fullscreen-mode');
          this.removeFullscreenExitButton();
          if (this.boundFullscreenHandler) {
            document.removeEventListener('fullscreenchange', this.boundFullscreenHandler);
            this.boundFullscreenHandler = null;
          }
          Toast.error('Impossible d\'activer le plein écran');
        });
      }
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }

  /**
   * Handle fullscreen change event
   */
  private handleFullscreenChange(): void {
    if (!document.fullscreenElement && this.gameElement) {
      // Remove fullscreen mode class
      this.gameElement.classList.remove('fullscreen-mode');
      this.removeFullscreenExitButton();
      
      // Remove the event listener
      if (this.boundFullscreenHandler) {
        document.removeEventListener('fullscreenchange', this.boundFullscreenHandler);
        this.boundFullscreenHandler = null;
      }
      
      // Reset fullscreen button icons
      const fullscreenIcon = this.gameElement.querySelector('.icon-btn .fullscreen-icon') as SVGElement;
      const exitIcon = this.gameElement.querySelector('.icon-btn .exit-fullscreen-icon') as SVGElement;
      if (fullscreenIcon) fullscreenIcon.style.display = 'block';
      if (exitIcon) exitIcon.style.display = 'none';
      
      // Update button title
      const fullscreenBtn = this.gameElement.querySelector('.icon-btn[title*="écran"]') as HTMLButtonElement;
      if (fullscreenBtn) fullscreenBtn.title = 'Plein écran';
      
      // Force reset of game container styles
      this.gameElement.style.display = '';
      this.gameElement.style.position = '';
      this.gameElement.style.width = '';
      this.gameElement.style.height = '';
      
      // Reset board container styles
      const boardContainer = this.gameElement.querySelector('.board-container') as HTMLElement;
      if (boardContainer) {
        boardContainer.style.width = '';
        boardContainer.style.height = '';
      }
      
      // Reset chess board styles
      const chessBoard = this.gameElement.querySelector('.chess-board') as HTMLElement;
      if (chessBoard) {
        chessBoard.style.width = '';
        chessBoard.style.height = '';
      }
      
      // Force re-render to ensure proper layout
      requestAnimationFrame(() => {
        if (this.board) {
          this.board.update();
        }
      });
    }
  }

  /**
   * Create fullscreen exit button
   */
  private createFullscreenExitButton(): void {
    this.removeFullscreenExitButton();
    
    const exitBtn = document.createElement('button');
    exitBtn.id = 'fullscreen-exit-btn';
    exitBtn.className = 'fullscreen-exit-btn';
    exitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
        <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
        <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
        <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
      </svg>
    `;
    exitBtn.title = 'Quitter le plein écran';
    exitBtn.addEventListener('click', () => {
      document.exitFullscreen();
    });
    
    this.gameElement?.appendChild(exitBtn);
  }

  /**
   * Remove fullscreen exit button
   */
  private removeFullscreenExitButton(): void {
    const exitBtn = document.getElementById('fullscreen-exit-btn');
    if (exitBtn) {
      exitBtn.remove();
    }
  }

  /**
   * Resize board for fullscreen mode
   */
  private resizeBoardForFullscreen(): void {
    if (!this.boardContainer || !this.board) return;
    
    const chessBoard = this.boardContainer.querySelector('.chess-board') as HTMLElement;
    if (!chessBoard) return;
    
    // Get viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Calculate the maximum square size that fits
    // Board should be square and fit within the viewport
    const maxSize = Math.min(vw, vh);
    
    // Apply size
    chessBoard.style.width = `${maxSize}px`;
    chessBoard.style.height = `${maxSize}px`;
    
    // Update board
    this.board.update();
  }

  /**
   * Creates the theme flip button
   */
  private createThemeFlipButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'glass-button small icon-btn theme-flip-btn';
    btn.title = 'Changer le thème des pièces';
    
    // Use a consistent SVG icon instead of piece image
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="theme-icon">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    `;
    
    btn.addEventListener('click', () => this.cycleTheme());
    return btn;
  }

  /**
   * Cycles to the next theme
   */
  private cycleTheme(): void {
    const currentIndex = GameScreen.THEME_ORDER.indexOf(this.settings.pieceTheme);
    const nextIndex = (currentIndex + 1) % GameScreen.THEME_ORDER.length;
    const newTheme = GameScreen.THEME_ORDER[nextIndex];
    
    if (this.themeBtn) {
      this.themeBtn.classList.add('flipping');
      setTimeout(() => {
        this.updateSettings({ ...this.settings, pieceTheme: newTheme });
        this.updateThemeButtonIcon(newTheme);
        this.themeBtn?.classList.remove('flipping');
      }, 200);
    }
  }

  /**
   * Updates the theme button icon
   */
  private updateThemeButtonIcon(theme: PieceTheme): void {
    // Icon is now a consistent SVG, no need to update
    // Just add a visual feedback animation
    if (this.themeBtn) {
      this.themeBtn.classList.add('theme-changed');
      setTimeout(() => this.themeBtn?.classList.remove('theme-changed'), 300);
    }
  }

  /**
   * Creates the game over overlay
   */
  private createGameOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'board-overlay';

    const title = document.createElement('div');
    title.className = 'board-overlay-title';
    overlay.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'board-overlay-subtitle';
    overlay.appendChild(subtitle);

    const actions = document.createElement('div');
    actions.className = 'board-overlay-actions';

    const rematchBtn = document.createElement('button');
    rematchBtn.className = 'glass-button primary';
    rematchBtn.textContent = 'Revanche';
    rematchBtn.addEventListener('click', () => {
      if (this.onRematch) {
        this.onRematch();
      }
    });
    actions.appendChild(rematchBtn);

    const exitBtn = document.createElement('button');
    exitBtn.className = 'glass-button secondary';
    exitBtn.textContent = 'Quitter';
    exitBtn.addEventListener('click', () => {
      if (this.onExit) {
        this.onExit();
      }
    });
    actions.appendChild(exitBtn);

    overlay.appendChild(actions);

    return overlay;
  }

  /**
   * Updates player info
   */
  updatePlayerInfo(color: PieceColor, name: string, time: number): void {
    if (color === PieceColor.WHITE) {
      this.whiteName = name;
      this.whiteTime = time;
    } else {
      this.blackName = name;
      this.blackTime = time;
    }
    this.updatePlayerCards();
  }

  /**
   * Updates player cards
   */
  private updatePlayerCards(): void {
    if (this.whitePlayerCard) {
      const isActive = this.game.currentTurn === PieceColor.WHITE;
      this.whitePlayerCard.classList.toggle('active', isActive);
      
      const timer = this.whitePlayerCard.querySelector('.player-timer');
      if (timer) {
        timer.textContent = formatTime(this.whiteTime);
        timer.classList.toggle('active', isActive);
      }
    }

    if (this.blackPlayerCard) {
      const isActive = this.game.currentTurn === PieceColor.BLACK;
      this.blackPlayerCard.classList.toggle('active', isActive);
      
      const timer = this.blackPlayerCard.querySelector('.player-timer');
      if (timer) {
        timer.textContent = formatTime(this.blackTime);
        timer.classList.toggle('active', isActive);
      }
    }
  }

  /**
   * Updates move history display
   */
  updateMoveHistory(): void {
    if (this.moveHistoryPanel) {
      const parent = this.moveHistoryPanel.parentElement;
      if (parent) {
        const newPanel = this.createMoveHistoryPanel();
        parent.replaceChild(newPanel, this.moveHistoryPanel);
        this.moveHistoryPanel = newPanel;
      }
    }
  }

  /**
   * Updates captured pieces display (no longer used - kept for compatibility)
   */
  private updateCapturedPieces(): void {
    // Captured pieces display has been removed from the UI
  }

  /**
   * Checks if the game is over and shows overlay
   */
  private checkGameOver(): void {
    if (this.game.isGameOver()) {
      this.showGameOver(this.game.gameStatus);
    }
  }

  /**
   * Shows the game over overlay
   */
  showGameOver(status: GameStatus, winner?: PieceColor): void {
    if (!this.gameOverlay) return;

    const title = this.gameOverlay.querySelector('.board-overlay-title');
    const subtitle = this.gameOverlay.querySelector('.board-overlay-subtitle');

    if (title && subtitle) {
      switch (status) {
        case GameStatus.WHITE_WINS_CHECKMATE:
          title.textContent = 'Échec et mat !';
          subtitle.textContent = `${this.whiteName} gagne !`;
          break;
        case GameStatus.BLACK_WINS_CHECKMATE:
          title.textContent = 'Échec et mat !';
          subtitle.textContent = `${this.blackName} gagne !`;
          break;
        case GameStatus.WHITE_WINS_RESIGNATION:
          title.textContent = 'Abandon';
          subtitle.textContent = `${this.whiteName} gagne !`;
          break;
        case GameStatus.BLACK_WINS_RESIGNATION:
          title.textContent = 'Abandon';
          subtitle.textContent = `${this.blackName} gagne !`;
          break;
        case GameStatus.WHITE_WINS_TIMEOUT:
          title.textContent = 'Temps écoulé';
          subtitle.textContent = `${this.whiteName} gagne !`;
          break;
        case GameStatus.BLACK_WINS_TIMEOUT:
          title.textContent = 'Temps écoulé';
          subtitle.textContent = `${this.blackName} gagne !`;
          break;
        case GameStatus.DRAW_STALEMATE:
          title.textContent = 'Pat';
          subtitle.textContent = 'Nulle';
          break;
        case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
          title.textContent = 'Matériel insuffisant';
          subtitle.textContent = 'Nulle';
          break;
        case GameStatus.DRAW_THREEFOLD_REPETITION:
          title.textContent = 'Triple répétition';
          subtitle.textContent = 'Nulle';
          break;
        case GameStatus.DRAW_FIFTY_MOVES:
          title.textContent = 'Règle des 50 coups';
          subtitle.textContent = 'Nulle';
          break;
        case GameStatus.DRAW_AGREEMENT:
          title.textContent = 'Nulle par accord mutuel';
          subtitle.textContent = 'Nulle';
          break;
        default:
          title.textContent = 'Partie terminée';
          subtitle.textContent = '';
      }
    }

    this.gameOverlay.classList.add('active');
  }

  /**
   * Hides the game over overlay
   */
  hideGameOver(): void {
    if (this.gameOverlay) {
      this.gameOverlay.classList.remove('active');
    }
  }

  /**
   * Plays a move sound
   */
  private playMoveSound(move: Move): void {
    // Sound implementation would go here
    // For now, just a placeholder
  }

  /**
   * Starts the game timer
   */
  startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      if (this.game.currentTurn === PieceColor.WHITE) {
        this.whiteTime = Math.max(0, this.whiteTime - 1);
        if (this.whiteTime === 0) {
          this.game.resign(); // Timeout
          this.checkGameOver();
        }
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
        if (this.blackTime === 0) {
          this.game.resign(); // Timeout
          this.checkGameOver();
        }
      }
      this.updatePlayerCards();
    }, 1000);
  }

  /**
   * Stops the game timer
   */
  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Gets the chess game instance
   */
  getGame(): ChessGame {
    return this.game;
  }

  /**
   * Gets the board instance
   */
  getBoard(): Board | null {
    return this.board;
  }

  /**
   * Updates the board display - re-renders the board
   */
  updateBoardDisplay(): void {
    if (this.board) {
      this.board.update();
    }
  }

  /**
   * Sets a new game instance and updates the display
   * @param game The new game instance
   */
  setGame(game: ChessGame): void {
    this.game = game;
    if (this.board) {
      // Re-initialize board with new game
      this.initBoard();
    }
  }

  /**
   * Flips the board orientation
   */
  flipBoard(): void {
    this.flipped = !this.flipped;
    if (this.board) {
      this.board.flip();
    }
  }

  /**
   * Returns whether the board is currently flipped
   */
  isFlipped(): boolean {
    return this.board ? this.board.isFlipped() : this.flipped;
  }

  /**
   * Gets the board container element
   */
  getBoardContainer(): HTMLElement | null {
    return this.boardContainer;
  }

  /**
   * Updates settings
   */
  updateSettings(settings: GameSettings): void {
    this.settings = settings;
    
    if (this.board) {
      this.board.setTheme(settings.pieceTheme);
      this.board.setShowCoordinates(settings.showCoordinates);
      this.board.setShowLegalMoves(settings.showLegalMoves);
    }
  }

  /**
   * Resets the game
   */
  reset(): void {
    this.game.reset();
    this.hideGameOver();
    this.render();
  }

  /**
   * Shows the game screen
   */
  show(): void {
    if (!this.gameElement) {
      this.render();
    }
    if (this.gameElement) {
      this.gameElement.style.display = 'grid';
    }
  }

  /**
   * Hides the game screen
   */
  hide(): void {
    if (this.gameElement) {
      this.gameElement.style.display = 'none';
    }
    this.stopTimer();
  }

  /**
   * Destroys the game screen
   */
  destroy(): void {
    this.stopTimer();
    if (this.board) {
      this.board.destroy();
      this.board = null;
    }
    if (this.gameElement) {
      this.gameElement.remove();
      this.gameElement = null;
    }
  }
}