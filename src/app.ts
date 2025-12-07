/**
 * Main Application Module
 *
 * The App class coordinates all components of the chess game:
 * - State management via Store
 * - Chess engine for game logic
 * - Network components for online play
 * - UI components for rendering
 * - Timer for time controls
 * - Sound effects
 * - AI opponent
 * - Coach mode with hints
 * - Analysis panel
 * - Game review
 */

import { store, AppState } from './store';
import { ChessGame, ChessAI, AIDifficulty } from './engine';
import { PeerConnection, RoomManager, GameSync } from './network';
import {
  MainMenu,
  Lobby,
  GameScreen,
  Settings,
  Toast,
  MoveArrows,
  AnalysisPanel,
  DifficultySelector,
  GameReview,
  LandingPage,
  type GameSettings
} from './ui/components';
import { Chat } from './ui/components/Chat';
import { Tutorial } from './ui/components/Tutorial';
import { ChessTimer, TIME_CONTROLS, type TimerConfig } from './utils/Timer';
import { SoundManager, getSoundManager } from './utils/SoundManager';
import {
  PieceTheme,
  Move,
  PieceColor,
  GameStatus,
  ConnectionStatus,
  MoveType,
} from './types';

/**
 * Main Application class
 *
 * Coordinates all game components and manages the application lifecycle.
 */
export class App {
  private container: HTMLElement;
  
  // Screens
  private landingPage: LandingPage | null = null;
  private mainMenu: MainMenu | null = null;
  private lobby: Lobby | null = null;
  private gameScreen: GameScreen | null = null;
  private settings: Settings | null = null;
  
  // Network
  private peerConnection: PeerConnection | null = null;
  private roomManager: RoomManager | null = null;
  private gameSync: GameSync | null = null;
  
  // Timer
  private timer: ChessTimer | null = null;
  
  // Sound
  private soundManager: SoundManager;
  
  // State subscription cleanup
  private unsubscribe: (() => void) | null = null;
  
  // Visibility handler
  private visibilityHandler: (() => void) | null = null;
  
  // AI components
  private ai: ChessAI | null = null;
  private moveArrows: MoveArrows | null = null;
  private analysisPanel: AnalysisPanel | null = null;
  private difficultySelector: DifficultySelector | null = null;
  private gameReview: GameReview | null = null;
  
  // Coach mode
  private isCoachMode: boolean = false;
  
  // Keyboard handler
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  
  // P2P Chat
  private chat: Chat | null = null;
  
  // Tutorial
  private tutorial: Tutorial | null = null;

  /**
   * Create a new App instance
   * @param container The container element to render into
   */
  constructor(container: HTMLElement) {
    this.container = container;
    this.soundManager = getSoundManager();
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    console.log('Initializing JemaChess...');
    
    // Load settings from storage
    store.loadSettings();
    
    // Initialize sound manager
    await this.initializeSounds();
    
    // Set up state subscription
    this.unsubscribe = store.subscribe(this.handleStateChange.bind(this));
    
    // Set up visibility change handler
    this.setupVisibilityHandler();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Show initial screen (landing page)
    this.showScreen('landing');
    
    console.log('JemaChess initialized successfully');
  }

  /**
   * Initialize sound manager
   */
  private async initializeSounds(): Promise<void> {
    // Set sound enabled state from store
    const state = store.getState();
    this.soundManager.setEnabled(state.soundEnabled);
    
    // Preload sounds (will be unlocked on first user interaction)
    try {
      await this.soundManager.loadSounds();
    } catch (error) {
      console.warn('Failed to preload sounds:', error);
    }
  }

  /**
   * Set up visibility change handler for timer accuracy
   */
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Resume timer if game is in progress
        const state = store.getState();
        if (state.timerRunning && this.timer) {
          this.timer.resume();
        }
      } else {
        // Pause timer when tab is hidden
        if (this.timer) {
          this.timer.pause();
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Show a specific screen
   * @param screen The screen to show
   */
  private showScreen(screen: AppState['currentScreen'] | 'landing'): void {
    // Update store (landing is handled separately)
    if (screen !== 'landing') {
      store.setScreen(screen as AppState['currentScreen']);
    }
    
    // Render the appropriate screen
    switch (screen) {
      case 'landing':
        this.renderLandingPage();
        break;
      case 'menu':
        this.renderMainMenu();
        break;
      case 'lobby':
        this.renderLobby();
        break;
      case 'game':
        this.renderGameScreen();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  }

  /**
   * Render the landing page
   */
  private renderLandingPage(): void {
    // Create landing page with container
    this.landingPage = new LandingPage(this.container);
    
    // Set up event handlers - direct game starts from landing page
    this.landingPage.onGetStarted = () => this.showDifficultySelectorFromLanding();
    this.landingPage.onPlay = () => this.showDifficultySelectorFromLanding();
    this.landingPage.onSocial = () => {
      this.showChatSection();
    };
    this.landingPage.onLearn = () => {
      this.showLearnSection();
    };
    this.landingPage.onSettings = () => this.showScreen('settings');
    
    // Submenu handlers - direct game starts
    this.landingPage.onPlayVsBots = () => {
      this.showDifficultySelectorFromLanding();
    };
    this.landingPage.onPlayWithCoach = () => {
      this.startCoachGame();
    };
    this.landingPage.onPlayOnline = () => {
      this.showScreen('lobby');
    };
    this.landingPage.onPlayLocal = () => {
      this.startLocalGame();
    };
    
    // Render
    this.landingPage.render();
    
    // Unlock audio on first interaction
    this.container.addEventListener('click', () => {
      this.soundManager.unlockAudio();
    }, { once: true });
  }

  /**
   * Show difficulty selector modal from landing page
   */
  private showDifficultySelectorFromLanding(): void {
    const modal = document.createElement('div');
    modal.className = 'difficulty-modal';
    modal.innerHTML = `
      <div class="difficulty-modal-content">
        <h3>Choisir la difficulté</h3>
        <div class="difficulty-options">
          <div class="difficulty-option" data-difficulty="easy">
            <div class="difficulty-icon">
              <span class="star-rating">★</span>
            </div>
            <div class="info">
              <div class="name">Facile</div>
              <div class="rating">Classement ~800</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="medium">
            <div class="difficulty-icon">
              <span class="star-rating">★★</span>
            </div>
            <div class="info">
              <div class="name">Moyen</div>
              <div class="rating">Classement ~1200</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="hard">
            <div class="difficulty-icon">
              <span class="star-rating">★★★</span>
            </div>
            <div class="info">
              <div class="name">Difficile</div>
              <div class="rating">Classement ~1600</div>
            </div>
          </div>
          <div class="difficulty-option" data-difficulty="master">
            <div class="difficulty-icon">
              <span class="star-rating">★★★★</span>
            </div>
            <div class="info">
              <div class="name">Maître</div>
              <div class="rating">Classement ~2000</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles for the modal
    this.addDifficultyModalStyles();

    // Handle option clicks
    const options = modal.querySelectorAll('.difficulty-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const difficulty = option.getAttribute('data-difficulty') as AIDifficulty;
        modal.remove();
        this.startAIGame(difficulty);
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
   * Add styles for difficulty modal
   */
  private addDifficultyModalStyles(): void {
    const styleId = 'difficulty-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
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
      
      .difficulty-option:hover .difficulty-icon {
        background: rgba(83, 86, 168, 0.25);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Render the main menu
   */
  private renderMainMenu(): void {
    // Create main menu with container
    this.mainMenu = new MainMenu(this.container);
    
    // Set up event handlers
    this.mainMenu.onPlayLocal = () => this.startLocalGame();
    this.mainMenu.onPlayOnline = () => this.showScreen('lobby');
    this.mainMenu.onSettings = () => this.showScreen('settings');
    
    // Play vs Computer handler
    this.mainMenu.onPlayComputer = (difficulty: AIDifficulty) => {
      this.startAIGame(difficulty);
    };
    
    // Play with Coach handler
    this.mainMenu.onPlayCoach = () => {
      this.startCoachGame();
    };
    
    // Render
    this.mainMenu.render();
    
    // Unlock audio on first interaction
    this.container.addEventListener('click', () => {
      this.soundManager.unlockAudio();
    }, { once: true });
  }

  /**
   * Render the lobby screen
   */
  private renderLobby(): void {
    // Create lobby with container
    this.lobby = new Lobby(this.container);
    
    // Set up event handlers
    this.lobby.onCreateRoom = (playerName: string) => this.handleCreateRoom(playerName);
    this.lobby.onJoinRoom = (code: string, playerName: string) => this.handleJoinRoom(code, playerName);
    this.lobby.onBack = () => this.showScreen('landing');
    this.lobby.onLeave = () => this.handleLeaveLobby();
    this.lobby.onReady = () => this.handlePlayerReady();
    
    // Render
    this.lobby.render();
  }

  /**
   * Render the game screen
   */
  private renderGameScreen(): void {
    const state = store.getState();
    
    // Create game screen with container and settings
    this.gameScreen = new GameScreen(this.container, {
      pieceTheme: state.pieceTheme,
      soundEnabled: state.soundEnabled,
      showLegalMoves: true,
      showCoordinates: state.showCoordinates,
      autoQueen: state.autoQueen,
    });
    
    // Set up event handlers
    this.gameScreen.onMove = (move: Move) => this.handleMove(move);
    this.gameScreen.onResign = () => this.handleResign();
    this.gameScreen.onOfferDraw = () => this.handleOfferDraw();
    this.gameScreen.onRematch = () => this.handleRematch();
    this.gameScreen.onExit = () => this.handleLeaveGame();
    
    // Initialize and render
    this.gameScreen.init();
    
    // IMPORTANT: Sync the game screen with the store's game instance
    // This ensures the Board uses the same game as the store
    if (state.game) {
      this.gameScreen.setGame(state.game);
    }
    
    // Initialize move arrows on the board
    this.initializeMoveArrows();
    
    // Initialize analysis panel if enabled
    if (state.analysisEnabled && state.game) {
      this.initializeAnalysisPanel(state.game);
    }
    
    // Show hint button in coach mode
    if (this.isCoachMode) {
      this.showCoachModeUI();
    }
  }

  /**
   * Render the settings screen
   */
  private renderSettings(): void {
    const state = store.getState();
    
    // Create settings with container
    this.settings = new Settings(this.container, {
      pieceTheme: state.pieceTheme,
      soundEnabled: state.soundEnabled,
      showLegalMoves: true,
      showCoordinates: state.showCoordinates,
      autoQueen: state.autoQueen,
    });
    
    // Set up event handlers
    this.settings.onSettingsChange = (settings: GameSettings) => this.handleSettingsChange(settings);
    this.settings.onClose = () => this.showScreen('landing');
    
    // Render
    this.settings.render();
  }

  // ============================================
  // Game Flow
  // ============================================

  /**
   * Start a local game
   * @param timeControl Optional time control settings
   */
  private startLocalGame(timeControl?: TimerConfig): void {
    // Use default time control if not specified
    const config = timeControl || TIME_CONTROLS.RAPID_10_0;
    
    // Reset AI and coach mode
    this.ai = null;
    this.isCoachMode = false;
    store.disableAI();
    store.disableCoachMode();
    
    // Start new game in store
    store.startNewGame('local', {
      initial: config.initialTime,
      increment: config.increment,
    });
    
    // Initialize timer
    this.initializeTimer(config);
    
    // Play game start sound
    this.soundManager.play('gameStart');
    
    // Show game screen
    this.showScreen('game');
    
    // Start the timer
    this.timer?.start(PieceColor.WHITE);
    store.startTimer();
  }

  /**
   * Start a game against the AI
   * @param difficulty AI difficulty level
   */
  private startAIGame(difficulty: AIDifficulty): void {
    // Use default time control
    const config = TIME_CONTROLS.RAPID_10_0;
    
    // Initialize AI
    this.ai = new ChessAI(difficulty);
    this.isCoachMode = false;
    
    // Disable coach mode first
    store.disableCoachMode();
    
    // Start new game in store with 'local' mode (we'll handle AI separately)
    store.startNewGame('local', {
      initial: config.initialTime,
      increment: config.increment,
    });
    
    // Enable AI AFTER starting the game (so it doesn't get reset)
    store.enableAI(difficulty);
    
    // Player plays as white by default
    store.setPlayerColor(PieceColor.WHITE);
    store.setPlayers('Vous', `IA (${difficulty})`);
    
    // Initialize timer
    this.initializeTimer(config);
    
    // Play game start sound
    this.soundManager.play('gameStart');
    
    // Show game screen
    this.showScreen('game');
    
    // Start the timer
    this.timer?.start(PieceColor.WHITE);
    store.startTimer();
    
    const difficultyNames: Record<AIDifficulty, string> = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile',
      master: 'Maître'
    };
    Toast.info(`Partie contre l'IA ${difficultyNames[difficulty]}`);
  }

  /**
   * Start a game with coach mode (hints enabled)
   */
  private startCoachGame(): void {
    // Use default time control
    const config = TIME_CONTROLS.RAPID_10_0;
    
    // Initialize AI for hints
    this.ai = new ChessAI('hard');
    this.isCoachMode = true;
    
    // Update store
    store.enableCoachMode();
    store.disableAI();
    
    // Start new game in store with 'coach' mode
    store.startNewGame('coach' as any, {
      initial: config.initialTime,
      increment: config.increment,
    });
    
    // Initialize timer
    this.initializeTimer(config);
    
    // Play game start sound
    this.soundManager.play('gameStart');
    
    // Show game screen
    this.showScreen('game');
    
    // Start the timer
    this.timer?.start(PieceColor.WHITE);
    store.startTimer();
    
    Toast.info('Mode Coach activé - Appuyez sur H pour les indices');
  }

  /**
   * Handle AI move after player moves
   */
  private handleAIMove(): void {
    const state = store.getState();
    
    // Check if AI is enabled and game exists
    if (!this.ai || !state.game) {
      console.log('AI move skipped: no AI or no game');
      return;
    }
    
    if (state.game.isGameOver()) {
      console.log('AI move skipped: game is over');
      return;
    }
    
    // Check if it's AI's turn (AI plays black by default, player plays white)
    const aiColor = state.playerColor === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    const currentTurn = state.game.currentTurn;
    
    console.log('AI check - Player color:', state.playerColor, 'AI color:', aiColor, 'Current turn:', currentTurn);
    
    if (currentTurn !== aiColor) {
      console.log('AI move skipped: not AI turn');
      return;
    }
    
    // Set AI thinking state
    store.setAIThinking(true);
    console.log('AI is thinking...');
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const currentState = store.getState();
      if (!this.ai || !currentState.game) {
        store.setAIThinking(false);
        console.log('AI move cancelled: no AI or no game');
        return;
      }
      
      if (currentState.game.isGameOver()) {
        store.setAIThinking(false);
        console.log('AI move cancelled: game ended');
        return;
      }
      
      console.log('AI calculating best move...');
      const move = this.ai.getBestMove(currentState.game);
      
      store.setAIThinking(false);
      
      if (move) {
        console.log('AI plays:', move.from, '->', move.to);
        // AI needs to make the move on the game (unlike player moves which are made by Board)
        this.executeAIMove(move);
      } else {
        console.log('AI could not find a move');
      }
    }, 500); // Small delay for better UX
  }

  /**
   * Execute an AI move - makes the move on the game and updates UI
   */
  private executeAIMove(move: Move): void {
    const state = store.getState();
    if (!state.game) return;

    // Make the move on the game
    const success = state.game.makeMove(move);
    if (!success) {
      console.log('AI move failed to execute');
      return;
    }

    // Update store state
    store.setState({
      lastMove: { from: move.from, to: move.to },
      selectedSquare: null,
      validMoves: [],
      drawOffered: false,
      drawOfferFrom: null,
    });

    // Update move count in stats
    const newStats = { ...state.gameStats };
    newStats.totalMoves++;
    newStats.lastUpdated = Date.now();
    store.setState({ gameStats: newStats });

    // Play appropriate sound
    this.playMoveSound(move);

    // Clear any suggestion arrows (keep board clean)
    if (this.moveArrows) {
      this.moveArrows.clear();
    }

    // Switch timer
    if (this.timer) {
      this.timer.switch();
      store.switchTimer();
    }

    // Update the game screen display
    if (this.gameScreen) {
      this.gameScreen.updateBoardDisplay();
      this.gameScreen.updateMoveHistory();
    }

    // Update analysis panel
    if (this.analysisPanel && state.game) {
      this.analysisPanel.updateGame(state.game);
    }

    // Check for game over
    this.checkGameOver();
  }

  /**
   * Show hint in coach mode
   */
  private showHint(): void {
    const state = store.getState();
    
    if (!this.ai || !state.game || !this.moveArrows) {
      Toast.warning('Indices non disponibles');
      return;
    }
    
    // Get best move from AI
    const bestMove = this.ai.getBestMove(state.game);
    
    if (bestMove) {
      // Show suggestion arrow
      this.moveArrows.showSuggestion(bestMove.from, bestMove.to);
      Toast.info('Indice : Meilleur coup affiché');
    } else {
      Toast.warning('Aucun indice disponible');
    }
  }

  /**
   * Initialize move arrows on the board
   */
  private initializeMoveArrows(): void {
    // Find the board container
    const boardContainer = this.container.querySelector('.board-container') as HTMLElement;
    if (boardContainer) {
      this.moveArrows = new MoveArrows(boardContainer);
    }
  }

  /**
   * Initialize analysis panel
   */
  private initializeAnalysisPanel(game: ChessGame): void {
    // Find or create analysis container
    let analysisContainer = this.container.querySelector('.analysis-container') as HTMLElement;
    if (!analysisContainer) {
      analysisContainer = document.createElement('div');
      analysisContainer.className = 'analysis-container';
      this.container.appendChild(analysisContainer);
    }
    
    this.analysisPanel = new AnalysisPanel(analysisContainer, game);
    this.analysisPanel.render();
    
    // Set up callback for best move click
    this.analysisPanel.onBestMoveClick = (move: Move) => {
      if (this.moveArrows) {
        this.moveArrows.showSuggestion(move.from, move.to);
      }
    };
  }

  /**
   * Show coach mode UI elements
   */
  private showCoachModeUI(): void {
    // Add hint button to game screen
    const gameControls = this.container.querySelector('.game-controls');
    if (gameControls) {
      const hintBtn = document.createElement('button');
      hintBtn.className = 'glass-button hint-btn';
      hintBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Hint (H)
      `;
      hintBtn.addEventListener('click', () => this.showHint());
      gameControls.appendChild(hintBtn);
    }
  }

  /**
   * Show game review panel
   */
  private showGameReview(): void {
    const state = store.getState();
    
    if (!state.game) {
      Toast.warning('Aucune partie à revoir');
      return;
    }
    
    // Enter review mode
    store.enterReviewMode();
    
    // Find or create review container
    let reviewContainer = this.container.querySelector('.review-container') as HTMLElement;
    if (!reviewContainer) {
      reviewContainer = document.createElement('div');
      reviewContainer.className = 'review-container';
      this.container.appendChild(reviewContainer);
    }
    
    this.gameReview = new GameReview(reviewContainer, state.game);
    this.gameReview.render();
    
    // Set up callbacks
    this.gameReview.onPositionChange = (game: ChessGame, moveIndex: number) => {
      store.setReviewMoveIndex(moveIndex);
      // Update board display - set the game and update
      if (this.gameScreen) {
        this.gameScreen.setGame(game);
      }
      // Update move arrows
      if (this.moveArrows && moveIndex >= 0 && state.game) {
        const move = state.game.moveHistory[moveIndex];
        this.moveArrows.showLastMove(move.from, move.to);
      }
    };
    
    this.gameReview.onClose = () => {
      store.exitReviewMode();
      if (this.gameReview) {
        this.gameReview.destroy();
        this.gameReview = null;
      }
    };
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      const state = store.getState();
      
      // Don't handle shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Review mode navigation
      if (state.reviewMode && this.gameReview) {
        switch (e.key) {
          case 'ArrowLeft':
            this.gameReview.goToMove(state.reviewMoveIndex - 1);
            break;
          case 'ArrowRight':
            this.gameReview.goToMove(state.reviewMoveIndex + 1);
            break;
          case 'ArrowUp':
          case 'Home':
            this.gameReview.goToMove(-1);
            break;
          case 'ArrowDown':
          case 'End':
            this.gameReview.goToMove(state.game?.moveHistory.length ?? 0 - 1);
            break;
          case 'Escape':
            this.gameReview.hide();
            store.exitReviewMode();
            break;
        }
        return;
      }
      
      // Game shortcuts
      if (state.currentScreen === 'game') {
        switch (e.key.toLowerCase()) {
          case 'h':
            // H for hint in coach mode
            if (this.isCoachMode) {
              this.showHint();
            }
            break;
          case 'f':
            // F to flip board
            if (this.gameScreen) {
              this.gameScreen.flipBoard();
              if (this.moveArrows) {
                this.moveArrows.setFlipped(this.gameScreen.isFlipped());
              }
            }
            break;
          case 'r':
            // R to show game review (after game ends)
            if (state.game?.isGameOver()) {
              this.showGameReview();
            }
            break;
          case 'a':
            // A to toggle analysis
            if (state.analysisEnabled) {
              store.disableAnalysis();
              if (this.analysisPanel) {
                this.analysisPanel.hide();
              }
            } else {
              store.enableAnalysis();
              if (state.game) {
                if (!this.analysisPanel) {
                  this.initializeAnalysisPanel(state.game);
                } else {
                  this.analysisPanel.show();
                }
              }
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Start an online game
   */
  private startOnlineGame(): void {
    // Start new game in store
    store.startNewGame('online', {
      initial: TIME_CONTROLS.RAPID_10_0.initialTime,
      increment: TIME_CONTROLS.RAPID_10_0.increment,
    });
    
    // Initialize timer
    this.initializeTimer(TIME_CONTROLS.RAPID_10_0);
    
    // Play game start sound
    this.soundManager.play('gameStart');
    
    // Show game screen
    this.showScreen('game');
    
    // Start the timer
    this.timer?.start(PieceColor.WHITE);
    store.startTimer();
  }

  /**
   * Initialize the chess timer
   * @param config Timer configuration
   */
  private initializeTimer(config: TimerConfig): void {
    // Clean up existing timer
    if (this.timer) {
      this.timer.destroy();
    }
    
    this.timer = new ChessTimer(config);
    
    // Set up timer callbacks
    this.timer.onTick = (whiteTime: number, blackTime: number) => {
      this.handleTimerTick(whiteTime, blackTime);
    };
    
    this.timer.onTimeout = (color: PieceColor) => {
      this.handleTimeout(color);
    };
    
    this.timer.onLowTime = () => {
      this.soundManager.play('lowTime');
    };
  }

  /**
   * Handle a move being made
   * @param move The move to make
   */
  private handleMove(move: Move): void {
    const state = store.getState();
    const { gameMode } = state;
    
    // The move has already been made by the Board component on the game instance
    // We just need to update the store's state (lastMove, stats, etc.) without re-making the move
    // Check if the game exists and the move was valid (Board already validated it)
    if (!state.game) {
      this.soundManager.play('illegal');
      return;
    }
    
    // Update store state for the move that was already made by Board
    // We call makeMove but it will return false since the move was already made
    // So we need to manually update the store state
    store.setState({
      lastMove: { from: move.from, to: move.to },
      selectedSquare: null,
      validMoves: [],
      drawOffered: false,
      drawOfferFrom: null,
    });
    
    // Update move count in stats
    const newStats = { ...state.gameStats };
    newStats.totalMoves++;
    newStats.lastUpdated = Date.now();
    store.setState({ gameStats: newStats });
    
    // Play appropriate sound
    this.playMoveSound(move);
    
    // Clear any arrows (no last move arrow)
    if (this.moveArrows) {
      this.moveArrows.clear();
    }
    
    // Switch timer
    if (this.timer) {
      this.timer.switch();
      store.switchTimer();
    }
    
    // Get fresh state after move
    const newState = store.getState();
    
    // Update analysis panel
    if (this.analysisPanel && newState.game) {
      this.analysisPanel.updateGame(newState.game);
    }
    
    // Send move to opponent if online
    if (gameMode === 'online' && this.gameSync) {
      // GameSync handles move synchronization
    }
    
    // Check for game over
    this.checkGameOver();
    
    // Trigger AI move if playing against computer
    // Use fresh state and check if AI instance exists
    if (this.ai && newState.aiEnabled && newState.game && !newState.game.isGameOver()) {
      this.handleAIMove();
    }
  }

  /**
   * Play the appropriate sound for a move
   * @param move The move that was made
   */
  private playMoveSound(move: Move): void {
    const isCapture = move.captured !== undefined;
    const isCastle = move.moveType === MoveType.CASTLING_KINGSIDE || 
                     move.moveType === MoveType.CASTLING_QUEENSIDE;
    const isPromotion = move.moveType === MoveType.PROMOTION;
    const isCheck = move.isCheck;
    
    this.soundManager.playMoveSound(isCapture, isCastle, isPromotion, isCheck);
  }

  /**
   * Check if the game is over and handle accordingly
   */
  private checkGameOver(): void {
    const state = store.getState();
    const { game } = state;
    
    if (!game) return;
    
    if (game.isGameOver()) {
      this.handleGameOver();
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(): void {
    // Stop timer
    if (this.timer) {
      this.timer.stop();
    }
    store.stopTimer();
    
    // Play game end sound
    this.soundManager.play('gameEnd');
    
    // Show game over notification
    const state = store.getState();
    const { game } = state;
    
    if (game) {
      const status = game.gameStatus;
      const message = this.getGameOverMessage(status);
      Toast.info(message, 5000);
      
      // Show review option
      setTimeout(() => {
        Toast.info('Appuyez sur R pour revoir la partie', 3000);
      }, 2000);
    }
  }

  /**
   * Get a human-readable game over message
   * @param status The game status
   * @returns The message to display
   */
  private getGameOverMessage(status: GameStatus): string {
    switch (status) {
      case GameStatus.WHITE_WINS_CHECKMATE:
        return 'Échec et mat ! Les Blancs gagnent !';
      case GameStatus.BLACK_WINS_CHECKMATE:
        return 'Échec et mat ! Les Noirs gagnent !';
      case GameStatus.WHITE_WINS_RESIGNATION:
        return 'Les Noirs abandonnent. Les Blancs gagnent !';
      case GameStatus.BLACK_WINS_RESIGNATION:
        return 'Les Blancs abandonnent. Les Noirs gagnent !';
      case GameStatus.WHITE_WINS_TIMEOUT:
        return 'Temps écoulé pour les Noirs. Les Blancs gagnent !';
      case GameStatus.BLACK_WINS_TIMEOUT:
        return 'Temps écoulé pour les Blancs. Les Noirs gagnent !';
      case GameStatus.DRAW_STALEMATE:
        return 'Pat ! La partie est nulle.';
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
        return 'Nulle par matériel insuffisant.';
      case GameStatus.DRAW_THREEFOLD_REPETITION:
        return 'Nulle par triple répétition.';
      case GameStatus.DRAW_FIFTY_MOVES:
        return 'Nulle par la règle des 50 coups.';
      case GameStatus.DRAW_AGREEMENT:
        return 'Nulle par accord mutuel.';
      default:
        return 'Partie terminée !';
    }
  }

  /**
   * Handle resignation
   */
  private handleResign(): void {
    store.resign();
    this.handleGameOver();
  }

  /**
   * Handle draw offer
   */
  private handleOfferDraw(): void {
    store.offerDraw();
    Toast.info('Nulle proposée');
  }

  /**
   * Handle accepting a draw
   */
  private handleAcceptDraw(): void {
    store.acceptDraw();
    this.handleGameOver();
  }

  /**
   * Handle declining a draw
   */
  private handleDeclineDraw(): void {
    store.declineDraw();
    Toast.info('Nulle refusée');
  }

  /**
   * Handle rematch request
   */
  private handleRematch(): void {
    const state = store.getState();
    if (state.gameMode === 'local') {
      this.startLocalGame();
    } else if (state.gameMode === 'computer') {
      // Restart AI game with same difficulty
      this.startAIGame(state.aiDifficulty);
    } else if (state.gameMode === 'coach') {
      // Restart coach game
      this.startCoachGame();
    } else {
      // For online, would need to coordinate with opponent
      Toast.info('Revanche demandée');
    }
  }

  /**
   * Handle leaving the game
   */
  private handleLeaveGame(): void {
    // Stop timer
    if (this.timer) {
      this.timer.stop();
    }
    
    // Disconnect from online game
    if (this.peerConnection) {
      this.peerConnection.disconnect();
    }
    
    // Clean up AI and coach mode
    this.ai = null;
    this.isCoachMode = false;
    store.disableAI();
    store.disableCoachMode();
    
    // Clean up move arrows
    if (this.moveArrows) {
      this.moveArrows.destroy();
      this.moveArrows = null;
    }
    
    // Clean up analysis panel
    if (this.analysisPanel) {
      this.analysisPanel.destroy();
      this.analysisPanel = null;
    }
    
    // Clean up game review
    if (this.gameReview) {
      this.gameReview.destroy();
      this.gameReview = null;
    }
    
    // Exit review mode
    store.exitReviewMode();
    
    // Reset store
    store.reset();
    
    // Go back to landing page
    this.showScreen('landing');
  }

  // ============================================
  // Online Game Handlers
  // ============================================

  /**
   * Handle creating a room
   * @param playerName The player's name
   */
  private async handleCreateRoom(playerName: string): Promise<void> {
    try {
      store.setConnectionState({ status: ConnectionStatus.CONNECTING });
      store.setPlayers(playerName, 'Waiting...');
      
      // Initialize peer connection if needed
      if (!this.peerConnection) {
        this.peerConnection = new PeerConnection();
      }
      
      // Create room (this also connects to the signaling server)
      const roomId = await this.peerConnection.createRoom();
      
      // Generate room code from peer ID
      const roomCode = roomId.substring(0, 6).toUpperCase();
      store.setRoomCode(roomCode);
      store.setConnectionState({ status: ConnectionStatus.CONNECTED });
      
      Toast.success(`Salle créée : ${roomCode}`);
      
      // Update lobby UI
      if (this.lobby) {
        this.lobby.setRoomCode(roomCode);
      }
      
      // Set up connection event handlers
      this.setupPeerConnectionHandlers();
      
    } catch (error) {
      console.error('Failed to create room:', error);
      Toast.error('Failed to create room');
      store.setConnectionState({ status: ConnectionStatus.ERROR });
    }
  }

  /**
   * Handle joining a room
   * @param code The room code to join
   * @param playerName The player's name
   */
  private async handleJoinRoom(code: string, playerName: string): Promise<void> {
    try {
      store.setConnectionState({ status: ConnectionStatus.CONNECTING });
      
      // Initialize peer connection if needed
      if (!this.peerConnection) {
        this.peerConnection = new PeerConnection();
      }
      
      // Join the room (this connects to the signaling server and then to the host)
      await this.peerConnection.joinRoom(code.toLowerCase());
      
      store.setRoomCode(code);
      store.setConnectionState({ status: ConnectionStatus.CONNECTED });
      
      Toast.success('Connexion à la salle réussie');
      
      // Set up connection event handlers
      this.setupPeerConnectionHandlers();
      
      // Set up game sync
      this.setupGameSync();
      
    } catch (error) {
      console.error('Failed to join room:', error);
      Toast.error('Failed to join room');
      store.setConnectionState({ status: ConnectionStatus.ERROR });
    }
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;
    
    this.peerConnection.onConnected = (peerId: string) => {
      Toast.success('Opponent connected!');
      store.setConnectionState({ opponentId: peerId });
    };
    
    this.peerConnection.onDisconnected = (reason: string) => {
      Toast.warning(`Déconnecté : ${reason}`);
      this.handleDisconnect();
    };
    
    this.peerConnection.onError = (error: Error) => {
      console.error('Connection error:', error);
      Toast.error('Erreur de connexion');
    };
    
    this.peerConnection.onLatencyUpdate = (latency: number) => {
      store.setConnectionState({ latency });
    };
  }

  /**
   * Handle leaving the lobby
   */
  private handleLeaveLobby(): void {
    if (this.peerConnection) {
      this.peerConnection.disconnect();
    }
    store.setConnectionState({ status: ConnectionStatus.DISCONNECTED });
    store.setRoomCode(null);
    this.showScreen('landing');
  }

  /**
   * Handle player ready
   */
  private handlePlayerReady(): void {
    // Start the online game when both players are ready
    this.startOnlineGame();
  }

  /**
   * Set up game synchronization
   */
  private setupGameSync(): void {
    if (!this.peerConnection) return;
    
    // GameSync would be initialized here with the peer connection
    // For now, we'll handle basic message passing
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    store.setConnectionState({ status: ConnectionStatus.DISCONNECTED });
    
    // If game is in progress, opponent wins by disconnection
    const state = store.getState();
    if (state.game && !state.game.isGameOver()) {
      Toast.warning('Adversaire déconnecté');
    }
  }

  // ============================================
  // Timer Handlers
  // ============================================

  /**
   * Handle timer tick
   * @param whiteTime White's remaining time
   * @param blackTime Black's remaining time
   */
  private handleTimerTick(whiteTime: number, blackTime: number): void {
    store.updateTimers(whiteTime, blackTime);
    
    // Update game screen if visible
    if (this.gameScreen) {
      const state = store.getState();
      const whiteName = state.players.white || 'Blancs';
      const blackName = state.players.black || 'Noirs';
      // Convert ms to seconds for display
      this.gameScreen.updatePlayerInfo(PieceColor.WHITE, whiteName, Math.floor(whiteTime / 1000));
      this.gameScreen.updatePlayerInfo(PieceColor.BLACK, blackName, Math.floor(blackTime / 1000));
    }
  }

  /**
   * Handle timeout
   * @param color The color that ran out of time
   */
  private handleTimeout(color: PieceColor): void {
    store.handleTimeout(color);
    
    // Play timeout sound
    this.soundManager.play('gameEnd');
    
    // Show timeout message
    const winner = color === PieceColor.WHITE ? 'Les Noirs' : 'Les Blancs';
    Toast.info(`Temps écoulé ! ${winner} gagnent !`, 5000);
    
    this.handleGameOver();
  }

  // ============================================
  // Settings Handlers
  // ============================================

  /**
   * Handle settings change
   * @param settings The new settings
   */
  private handleSettingsChange(settings: GameSettings): void {
    store.updateSettings({
      soundEnabled: settings.soundEnabled,
      showCoordinates: settings.showCoordinates,
      autoQueen: settings.autoQueen,
    });
    
    if (settings.pieceTheme) {
      store.setTheme(settings.pieceTheme);
    }
    
    // Update sound manager
    this.soundManager.setEnabled(settings.soundEnabled);
    
    // Update game screen if active
    if (this.gameScreen) {
      this.gameScreen.updateSettings(settings);
    }
    
    Toast.success('Paramètres enregistrés');
  }

  // ============================================
  // Chat Section (P2P Chat)
  // ============================================

  /**
   * Show P2P Chat section
   */
  private showChatSection(): void {
    // Create chat instance if not exists
    if (!this.chat) {
      this.chat = new Chat();
    }
    
    // Set up close callback
    this.chat.onClose = () => {
      this.chat?.hide();
    };
    
    // Show the chat
    this.chat.show();
  }

  // ============================================
  // Section Handlers (Puzzles, Learn, News, etc.)
  // ============================================

  /**
   * Show Puzzles section modal
   */
  private showPuzzlesSection(): void {
    this.showSectionModal('puzzles', 'Puzzles', `
      <div class="section-content puzzles-content">
        <div class="puzzle-categories">
          <div class="puzzle-category" data-type="daily">
            <div class="puzzle-icon">📅</div>
            <div class="puzzle-info">
              <h4>Puzzle du jour</h4>
              <p>Un nouveau défi chaque jour</p>
            </div>
            <span class="puzzle-difficulty">★★☆</span>
          </div>
          <div class="puzzle-category" data-type="tactics">
            <div class="puzzle-icon">⚔️</div>
            <div class="puzzle-info">
              <h4>Tactiques</h4>
              <p>Améliorez vos combinaisons</p>
            </div>
            <span class="puzzle-difficulty">★★★</span>
          </div>
          <div class="puzzle-category" data-type="endgame">
            <div class="puzzle-icon">👑</div>
            <div class="puzzle-info">
              <h4>Finales</h4>
              <p>Maîtrisez les fins de partie</p>
            </div>
            <span class="puzzle-difficulty">★★☆</span>
          </div>
          <div class="puzzle-category" data-type="checkmate">
            <div class="puzzle-icon">🎯</div>
            <div class="puzzle-info">
              <h4>Mat en X coups</h4>
              <p>Trouvez le mat forcé</p>
            </div>
            <span class="puzzle-difficulty">★☆☆</span>
          </div>
        </div>
        <div class="puzzle-stats">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">Puzzles résolus</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">1200</span>
            <span class="stat-label">Classement Puzzle</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0%</span>
            <span class="stat-label">Taux de réussite</span>
          </div>
        </div>
      </div>
    `, (type) => {
      this.startPuzzle(type);
    });
  }

  /**
   * Start a puzzle
   */
  private startPuzzle(type: string): void {
    Toast.info(`Chargement du puzzle ${type}...`);
    // For now, start a coach game as a placeholder for puzzles
    setTimeout(() => {
      this.startCoachGame();
    }, 500);
  }

  /**
   * Show Learn section modal
   */
  private showLearnSection(): void {
    this.showSectionModal('learn', 'Apprendre', `
      <div class="section-content learn-content">
        <div class="learn-categories">
          <div class="learn-category" data-type="basics">
            <div class="learn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7d82ea" stroke-width="1.5">
                <path d="M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                <path d="M12 6.5v4"/>
                <rect x="4" y="10.5" width="16" height="10" rx="1"/>
                <path d="M8 14.5h8M8 17.5h5"/>
              </svg>
            </div>
            <div class="learn-info">
              <h4>Les bases</h4>
              <p>Règles et mouvements des pièces</p>
            </div>
            <svg class="learn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="learn-category" data-type="openings">
            <div class="learn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7d82ea" stroke-width="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <path d="M6.5 14v7M17.5 14v7"/>
                <path d="M3 17.5h7M14 17.5h7"/>
              </svg>
            </div>
            <div class="learn-info">
              <h4>Ouvertures</h4>
              <p>Débuts de partie populaires</p>
            </div>
            <svg class="learn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="learn-category" data-type="middlegame">
            <div class="learn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7d82ea" stroke-width="1.5">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 3"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div class="learn-info">
              <h4>Milieu de partie</h4>
              <p>Stratégies et tactiques</p>
            </div>
            <svg class="learn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="learn-category" data-type="endgame">
            <div class="learn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7d82ea" stroke-width="1.5">
                <path d="M12 2L8 6h8l-4-4Z"/>
                <rect x="9" y="6" width="6" height="3"/>
                <path d="M10 9v8h4V9"/>
                <rect x="7" y="17" width="10" height="3" rx="1"/>
                <path d="M5 20h14"/>
              </svg>
            </div>
            <div class="learn-info">
              <h4>Finales</h4>
              <p>Techniques de fin de partie</p>
            </div>
            <svg class="learn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>
    `, (type) => {
      this.startLesson(type);
    });
  }

  /**
   * Start a lesson - shows integrated tutorial
   */
  private startLesson(type: string): void {
    // Create tutorial instance if not exists
    if (!this.tutorial) {
      this.tutorial = new Tutorial();
    }
    
    // Valid section types
    const validTypes = ['basics', 'openings', 'middlegame', 'endgame'];
    
    if (validTypes.includes(type)) {
      this.tutorial.showSection(type);
    } else {
      Toast.warning('Tutoriel non disponible');
    }
  }

  /**
   * Show Watch section modal
   */
  private showWatchSection(): void {
    this.showSectionModal('watch', 'Regarder', `
      <div class="section-content watch-content">
        <div class="watch-categories">
          <div class="watch-category" data-type="live">
            <div class="watch-icon">🔴</div>
            <div class="watch-info">
              <h4>Parties en direct</h4>
              <p>Regardez des parties en temps réel</p>
            </div>
            <span class="live-count">12 en cours</span>
          </div>
          <div class="watch-category" data-type="top">
            <div class="watch-icon">⭐</div>
            <div class="watch-info">
              <h4>Top joueurs</h4>
              <p>Suivez les meilleurs</p>
            </div>
          </div>
          <div class="watch-category" data-type="tournaments">
            <div class="watch-icon">🏆</div>
            <div class="watch-info">
              <h4>Tournois</h4>
              <p>Compétitions en cours</p>
            </div>
          </div>
          <div class="watch-category" data-type="replays">
            <div class="watch-icon">📹</div>
            <div class="watch-info">
              <h4>Rediffusions</h4>
              <p>Parties célèbres</p>
            </div>
          </div>
        </div>
      </div>
    `, (type) => {
      Toast.info(`Section ${type} - Bientôt disponible`);
    });
  }

  /**
   * Show News section modal
   */
  private showNewsSection(): void {
    this.showSectionModal('news', 'Actualités', `
      <div class="section-content news-content">
        <div class="news-list">
          <div class="news-item">
            <div class="news-date">Aujourd'hui</div>
            <h4>Bienvenue sur Chess Royale !</h4>
            <p>Découvrez notre nouvelle application d'échecs avec IA intégrée.</p>
          </div>
          <div class="news-item">
            <div class="news-date">Hier</div>
            <h4>Nouveau mode Coach</h4>
            <p>Apprenez avec notre système d'indices intelligent.</p>
          </div>
          <div class="news-item">
            <div class="news-date">Cette semaine</div>
            <h4>Tournoi hebdomadaire</h4>
            <p>Participez à notre tournoi chaque dimanche à 20h.</p>
          </div>
          <div class="news-item">
            <div class="news-date">Ce mois</div>
            <h4>Mise à jour des puzzles</h4>
            <p>Plus de 1000 nouveaux puzzles ajoutés !</p>
          </div>
        </div>
      </div>
    `, () => {});
  }

  /**
   * Show Social section modal
   */
  private showSocialSection(): void {
    this.showSectionModal('social', 'Social', `
      <div class="section-content social-content">
        <div class="social-profile">
          <div class="profile-avatar">👤</div>
          <div class="profile-info">
            <h4>Joueur invité</h4>
            <p>Connectez-vous pour sauvegarder votre progression</p>
          </div>
        </div>
        <div class="social-categories">
          <div class="social-category" data-type="friends">
            <div class="social-icon">👥</div>
            <div class="social-info">
              <h4>Amis</h4>
              <p>0 ami en ligne</p>
            </div>
          </div>
          <div class="social-category" data-type="clubs">
            <div class="social-icon">🏠</div>
            <div class="social-info">
              <h4>Clubs</h4>
              <p>Rejoignez une communauté</p>
            </div>
          </div>
          <div class="social-category" data-type="messages">
            <div class="social-icon">💬</div>
            <div class="social-info">
              <h4>Messages</h4>
              <p>0 nouveau message</p>
            </div>
          </div>
          <div class="social-category" data-type="leaderboard">
            <div class="social-icon">📊</div>
            <div class="social-info">
              <h4>Classement</h4>
              <p>Votre position mondiale</p>
            </div>
          </div>
        </div>
      </div>
    `, (type) => {
      Toast.info(`Section ${type} - Bientôt disponible`);
    });
  }

  /**
   * Show Tournaments section modal
   */
  private showTournamentsSection(): void {
    this.showSectionModal('tournaments', 'Tournois', `
      <div class="section-content tournaments-content">
        <div class="tournament-list">
          <div class="tournament-item active">
            <div class="tournament-status">🔴 En cours</div>
            <h4>Tournoi du dimanche</h4>
            <p>Blitz 3+0 • 24 joueurs</p>
            <button class="join-btn">Rejoindre</button>
          </div>
          <div class="tournament-item upcoming">
            <div class="tournament-status">⏰ Dans 2h</div>
            <h4>Tournoi Rapide</h4>
            <p>Rapide 10+0 • 16 joueurs max</p>
            <button class="join-btn">S'inscrire</button>
          </div>
          <div class="tournament-item upcoming">
            <div class="tournament-status">📅 Demain</div>
            <h4>Championnat mensuel</h4>
            <p>Classique 15+10 • 32 joueurs</p>
            <button class="join-btn">S'inscrire</button>
          </div>
        </div>
        <div class="create-tournament">
          <button class="create-btn">+ Créer un tournoi</button>
        </div>
      </div>
    `, (action) => {
      if (action === 'create') {
        Toast.info('Création de tournoi - Bientôt disponible');
      } else {
        Toast.info('Inscription au tournoi - Bientôt disponible');
      }
    });
  }

  /**
   * Show Rankings section modal
   */
  private showRankingsSection(): void {
    this.showSectionModal('rankings', 'Classements', `
      <div class="section-content rankings-content">
        <div class="ranking-tabs">
          <button class="tab active">Mondial</button>
          <button class="tab">National</button>
          <button class="tab">Amis</button>
        </div>
        <div class="ranking-list">
          <div class="ranking-item gold">
            <span class="rank">1</span>
            <span class="player">🏆 Magnus C.</span>
            <span class="rating">2850</span>
          </div>
          <div class="ranking-item silver">
            <span class="rank">2</span>
            <span class="player">🥈 Fabiano C.</span>
            <span class="rating">2820</span>
          </div>
          <div class="ranking-item bronze">
            <span class="rank">3</span>
            <span class="player">🥉 Ding L.</span>
            <span class="rating">2810</span>
          </div>
          <div class="ranking-item">
            <span class="rank">4</span>
            <span class="player">Ian N.</span>
            <span class="rating">2795</span>
          </div>
          <div class="ranking-item">
            <span class="rank">5</span>
            <span class="player">Alireza F.</span>
            <span class="rating">2785</span>
          </div>
        </div>
        <div class="your-ranking">
          <span class="rank">--</span>
          <span class="player">Vous</span>
          <span class="rating">1200</span>
        </div>
      </div>
    `, () => {});
  }

  /**
   * Show a section modal with content
   */
  private showSectionModal(id: string, title: string, content: string, onAction: (action: string) => void): void {
    // Add modal styles if not present
    this.addSectionModalStyles();

    const modal = document.createElement('div');
    modal.className = 'section-modal';
    modal.id = `${id}-modal`;
    modal.innerHTML = `
      <div class="section-modal-content">
        <div class="section-modal-header">
          <h3>${title}</h3>
          <button class="close-btn">✕</button>
        </div>
        ${content}
      </div>
    `;

    // Handle close
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());

    // Handle background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Handle category clicks
    const categories = modal.querySelectorAll('[data-type]');
    categories.forEach(cat => {
      cat.addEventListener('click', () => {
        const type = cat.getAttribute('data-type');
        if (type) {
          modal.remove();
          onAction(type);
        }
      });
    });

    // Handle button clicks
    const buttons = modal.querySelectorAll('.join-btn, .create-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.remove();
        onAction(btn.classList.contains('create-btn') ? 'create' : 'join');
      });
    });

    document.body.appendChild(modal);
  }

  /**
   * Add styles for section modals
   */
  private addSectionModalStyles(): void {
    const styleId = 'section-modal-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .section-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
      }
      
      .section-modal-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .section-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .section-modal-header h3 {
        margin: 0;
        color: #fff;
        font-size: 1.5rem;
      }
      
      .section-modal .close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      .section-modal .close-btn:hover {
        color: #fff;
      }
      
      .section-content {
        padding: 24px;
      }
      
      /* Puzzle styles */
      .puzzle-categories, .learn-categories, .watch-categories, .social-categories {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .puzzle-category, .learn-category, .watch-category, .social-category {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .puzzle-category:hover, .learn-category:hover, .watch-category:hover, .social-category:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(4px);
      }
      
      .puzzle-icon, .watch-icon, .social-icon {
        font-size: 2rem;
        width: 48px;
        text-align: center;
      }
      
      .learn-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(83, 86, 168, 0.15);
        border-radius: 12px;
        flex-shrink: 0;
      }
      
      .learn-icon svg {
        width: 28px;
        height: 28px;
      }
      
      .learn-arrow {
        width: 20px;
        height: 20px;
        color: #7d82ea;
        flex-shrink: 0;
        opacity: 0.6;
        transition: opacity 0.2s, transform 0.2s;
      }
      
      .learn-category:hover .learn-arrow {
        opacity: 1;
        transform: translateX(4px);
      }
      
      .puzzle-info, .learn-info, .watch-info, .social-info {
        flex: 1;
      }
      
      .puzzle-info h4, .learn-info h4, .watch-info h4, .social-info h4 {
        margin: 0 0 4px 0;
        color: #fff;
        font-size: 1rem;
      }
      
      .puzzle-info p, .learn-info p, .watch-info p, .social-info p {
        margin: 0;
        color: #888;
        font-size: 0.85rem;
      }
      
      .puzzle-difficulty {
        color: #ffd700;
      }
      
      .live-count {
        background: #e74c3c;
        color: #fff;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
      }
      
      .puzzle-stats, .learn-progress {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .puzzle-stats {
        display: flex;
        justify-content: space-around;
      }
      
      .stat-item {
        text-align: center;
      }
      
      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
        color: #fff;
      }
      
      .stat-label {
        font-size: 0.75rem;
        color: #888;
      }
      
      .progress-bar {
        width: 60px;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 3px;
      }
      
      .learn-progress h4 {
        margin: 0 0 16px 0;
        color: #fff;
      }
      
      .overall-progress {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .progress-circle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: conic-gradient(#667eea 0%, rgba(255,255,255,0.1) 0%);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .progress-circle span {
        background: #1a1a2e;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: bold;
      }
      
      .overall-progress p {
        margin: 0;
        color: #888;
        font-size: 0.9rem;
      }
      
      /* News styles */
      .news-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .news-item {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
      }
      
      .news-date {
        font-size: 0.75rem;
        color: #667eea;
        margin-bottom: 8px;
      }
      
      .news-item h4 {
        margin: 0 0 8px 0;
        color: #fff;
      }
      
      .news-item p {
        margin: 0;
        color: #888;
        font-size: 0.9rem;
      }
      
      /* Social styles */
      .social-profile {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 20px;
      }
      
      .profile-avatar {
        font-size: 3rem;
      }
      
      .profile-info h4 {
        margin: 0 0 4px 0;
        color: #fff;
      }
      
      .profile-info p {
        margin: 0;
        color: #888;
        font-size: 0.85rem;
      }
      
      /* Tournament styles */
      .tournament-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .tournament-item {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .tournament-status {
        font-size: 0.75rem;
        color: #888;
      }
      
      .tournament-item.active .tournament-status {
        color: #e74c3c;
      }
      
      .tournament-item h4 {
        margin: 0;
        color: #fff;
      }
      
      .tournament-item p {
        margin: 0;
        color: #888;
        font-size: 0.85rem;
      }
      
      .join-btn, .create-btn {
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        font-weight: 500;
        align-self: flex-start;
      }
      
      .join-btn:hover, .create-btn:hover {
        opacity: 0.9;
      }
      
      .create-tournament {
        margin-top: 20px;
        text-align: center;
      }
      
      .create-btn {
        width: 100%;
        padding: 12px;
      }
      
      /* Rankings styles */
      .ranking-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }
      
      .ranking-tabs .tab {
        flex: 1;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 8px;
        color: #888;
        cursor: pointer;
      }
      
      .ranking-tabs .tab.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }
      
      .ranking-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .ranking-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }
      
      .ranking-item.gold {
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);
      }
      
      .ranking-item.silver {
        background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);
      }
      
      .ranking-item.bronze {
        background: linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%);
      }
      
      .ranking-item .rank {
        width: 30px;
        font-weight: bold;
        color: #888;
      }
      
      .ranking-item.gold .rank { color: #ffd700; }
      .ranking-item.silver .rank { color: #c0c0c0; }
      .ranking-item.bronze .rank { color: #cd7f32; }
      
      .ranking-item .player {
        flex: 1;
        color: #fff;
      }
      
      .ranking-item .rating {
        font-weight: bold;
        color: #667eea;
      }
      
      .your-ranking {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        border-radius: 8px;
        margin-top: 16px;
        border: 1px solid rgba(102, 126, 234, 0.3);
      }
      
      .your-ranking .rank {
        width: 30px;
        font-weight: bold;
        color: #667eea;
      }
      
      .your-ranking .player {
        flex: 1;
        color: #fff;
        font-weight: 500;
      }
      
      .your-ranking .rating {
        font-weight: bold;
        color: #667eea;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // State Subscription
  // ============================================

  /**
   * Handle state changes
   * @param state The new state
   */
  private handleStateChange(state: AppState): void {
    // State changes are handled by individual components
    // This is for any cross-cutting concerns
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up resources
   */
  destroy(): void {
    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    // Remove visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    // Remove keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    // Clean up timer
    if (this.timer) {
      this.timer.destroy();
      this.timer = null;
    }
    
    // Clean up network
    if (this.peerConnection) {
      this.peerConnection.disconnect();
      this.peerConnection = null;
    }
    
    // Clean up AI components
    this.ai = null;
    
    if (this.moveArrows) {
      this.moveArrows.destroy();
      this.moveArrows = null;
    }
    
    if (this.analysisPanel) {
      this.analysisPanel.destroy();
      this.analysisPanel = null;
    }
    
    if (this.difficultySelector) {
      this.difficultySelector.destroy();
      this.difficultySelector = null;
    }
    
    if (this.gameReview) {
      this.gameReview.destroy();
      this.gameReview = null;
    }
    
    // Clean up UI components
    if (this.landingPage) {
      this.landingPage.destroy();
      this.landingPage = null;
    }
    
    if (this.mainMenu) {
      this.mainMenu.destroy();
      this.mainMenu = null;
    }
    
    if (this.lobby) {
      this.lobby.destroy();
      this.lobby = null;
    }
    
    if (this.gameScreen) {
      this.gameScreen.destroy();
      this.gameScreen = null;
    }
    
    if (this.settings) {
      this.settings.destroy();
      this.settings = null;
    }
    
    // Clean up sound manager
    this.soundManager.destroy();
    
    // Clear container
    this.container.innerHTML = '';
  }
}

// Export for use in main.ts
export default App;