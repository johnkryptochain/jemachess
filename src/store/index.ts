/**
 * State Management Module
 *
 * Centralized state store using a pub/sub pattern.
 * Manages game state, connection state, UI state, and settings.
 */

import {
  GameStatus,
  ConnectionState,
  ConnectionStatus,
  PieceTheme,
  PieceColor,
  Move,
} from '../types';
import { ChessGame, AIDifficulty } from '../engine';

// ============================================
// State Types
// ============================================

/**
 * Application state interface
 */
/**
 * Game statistics interface
 */
export interface GameStats {
  gamesCreated: number;
  gamesOnline: number;
  gamesVsAI: number;
  gamesLocal: number;
  gamesCoach: number;
  totalMoves: number;
  lastUpdated: number;
}

export interface AppState {
  // Game state
  game: ChessGame | null;
  gameMode: 'local' | 'online' | 'computer' | 'coach' | null;
  playerColor: PieceColor;
  
  // Connection state (for online play)
  connectionState: ConnectionState;
  roomCode: string | null;
  players: { white: string; black: string };
  
  // UI state
  currentScreen: 'menu' | 'lobby' | 'game' | 'settings';
  pieceTheme: PieceTheme;
  selectedSquare: { file: number; rank: number } | null;
  validMoves: { file: number; rank: number }[];
  lastMove: { from: { file: number; rank: number }; to: { file: number; rank: number } } | null;
  
  // Timer state
  whiteTime: number; // milliseconds
  blackTime: number;
  increment: number; // milliseconds to add after each move
  timerRunning: boolean;
  activeTimer: PieceColor | null;
  
  // Settings
  soundEnabled: boolean;
  showCoordinates: boolean;
  autoQueen: boolean;
  confirmMoves: boolean;
  
  // Draw/Resign state
  drawOffered: boolean;
  drawOfferFrom: PieceColor | null;
  
  // AI state
  aiEnabled: boolean;
  aiDifficulty: AIDifficulty;
  aiThinking: boolean;
  
  // Coach mode
  coachMode: boolean;
  hintsEnabled: boolean;
  
  // Analysis
  analysisEnabled: boolean;
  currentEvaluation: number;
  
  // Premoves
  premove: Move | null;
  
  // Game review
  reviewMode: boolean;
  reviewMoveIndex: number;
  
  // Game statistics
  gameStats: GameStats;
}

/**
 * State listener callback type
 */
export type StateListener = (state: AppState) => void;

/**
 * Partial state update type
 */
export type PartialState = Partial<AppState>;

// ============================================
// Default State
// ============================================

/**
 * Default initial state
 */
const DEFAULT_STATE: AppState = {
  // Game state
  game: null,
  gameMode: null,
  playerColor: PieceColor.WHITE,
  
  // Connection state
  connectionState: {
    status: ConnectionStatus.DISCONNECTED,
    peerId: null,
    roomId: null,
    opponentId: null,
    opponentName: null,
    latency: 0,
    lastHeartbeat: 0,
  },
  roomCode: null,
  players: { white: 'Joueur 1', black: 'Joueur 2' },
  
  // UI state
  currentScreen: 'menu',
  pieceTheme: PieceTheme.CLASSIC,
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  
  // Timer state
  whiteTime: 10 * 60 * 1000, // 10 minutes default
  blackTime: 10 * 60 * 1000,
  increment: 0,
  timerRunning: false,
  activeTimer: null,
  
  // Settings
  soundEnabled: true,
  showCoordinates: true,
  autoQueen: false,
  confirmMoves: false,
  
  // Draw/Resign state
  drawOffered: false,
  drawOfferFrom: null,
  
  // AI state
  aiEnabled: false,
  aiDifficulty: 'medium',
  aiThinking: false,
  
  // Coach mode
  coachMode: false,
  hintsEnabled: false,
  
  // Analysis
  analysisEnabled: false,
  currentEvaluation: 0,
  
  // Premoves
  premove: null,
  
  // Game review
  reviewMode: false,
  reviewMoveIndex: -1,
  
  // Game statistics
  gameStats: {
    gamesCreated: 0,
    gamesOnline: 0,
    gamesVsAI: 0,
    gamesLocal: 0,
    gamesCoach: 0,
    totalMoves: 0,
    lastUpdated: Date.now(),
  },
};

// ============================================
// Store Class
// ============================================

/**
 * Centralized state store
 * 
 * Implements a simple pub/sub pattern for state management.
 * All state changes go through this store, and listeners are
 * notified of any changes.
 */
/**
 * Online session data for persistence
 */
export interface OnlineSession {
  roomId: string;
  isHost: boolean;
  playerName: string;
  opponentName: string;
  playerColor: PieceColor;
  gameFen: string;
  moveHistory: string[]; // Simplified move notation
  whiteTime: number;
  blackTime: number;
  timestamp: number;
}

export class Store {
  private state: AppState;
  private listeners: Set<StateListener> = new Set();
  private persistKeys: (keyof AppState)[] = [
    'pieceTheme',
    'soundEnabled',
    'showCoordinates',
    'autoQueen',
    'confirmMoves',
    'gameStats',
  ];
  
  private static ONLINE_SESSION_KEY = 'jemachess-online-session';
  private static SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

  constructor(initialState?: Partial<AppState>) {
    this.state = { ...DEFAULT_STATE, ...initialState };
    this.loadSettings();
  }

  // ============================================
  // Core State Methods
  // ============================================

  /**
   * Get the current state
   * @returns A copy of the current state
   */
  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   * @param listener Callback function to be called on state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state with partial changes
   * @param partial Partial state to merge
   */
  setState(partial: PartialState): void {
    const prevState = this.state;
    this.state = { ...this.state, ...partial };
    
    // Check if any persisted keys changed
    const shouldPersist = this.persistKeys.some(
      key => partial[key] !== undefined && partial[key] !== prevState[key]
    );
    
    if (shouldPersist) {
      this.saveSettings();
    }
    
    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(stateCopy);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // ============================================
  // Game Actions
  // ============================================

  /**
   * Start a new game
   * @param mode Game mode ('local' or 'online')
   * @param timeControl Optional time control settings
   */
  startNewGame(
    mode: 'local' | 'online',
    timeControl?: { initial: number; increment: number }
  ): void {
    const game = new ChessGame();
    game.reset(); // Initialize the board with pieces
    
    const initialTime = timeControl?.initial ?? 10 * 60 * 1000;
    const increment = timeControl?.increment ?? 0;
    
    // Update game statistics
    const newStats = { ...this.state.gameStats };
    newStats.gamesCreated++;
    newStats.lastUpdated = Date.now();
    
    if (mode === 'online') {
      newStats.gamesOnline++;
    } else if (mode === 'local') {
      newStats.gamesLocal++;
    }
    
    this.setState({
      game,
      gameMode: mode,
      currentScreen: 'game',
      whiteTime: initialTime,
      blackTime: initialTime,
      increment,
      timerRunning: false,
      activeTimer: null,
      selectedSquare: null,
      validMoves: [],
      lastMove: null,
      drawOffered: false,
      drawOfferFrom: null,
      gameStats: newStats,
    });
  }

  /**
   * Make a move in the current game
   * @param move The move to make
   * @returns True if the move was successful
   */
  makeMove(move: Move): boolean {
    const { game, gameStats } = this.state;
    if (!game) return false;
    
    const success = game.makeMove(move);
    if (!success) return false;
    
    // Update move count in stats
    const newStats = { ...gameStats };
    newStats.totalMoves++;
    newStats.lastUpdated = Date.now();
    
    // Update state
    this.setState({
      lastMove: { from: move.from, to: move.to },
      selectedSquare: null,
      validMoves: [],
      drawOffered: false,
      drawOfferFrom: null,
      gameStats: newStats,
    });
    
    return true;
  }

  /**
   * Resign the current game
   */
  resign(): void {
    const { game } = this.state;
    if (!game) return;
    
    // The game's resign method handles the status update
    game.resign();
    
    this.setState({
      timerRunning: false,
      activeTimer: null,
    });
  }

  /**
   * Offer a draw
   */
  offerDraw(): void {
    const { game, gameMode, playerColor } = this.state;
    if (!game) return;
    
    const offeringColor = gameMode === 'online'
      ? playerColor
      : game.currentTurn;
    
    this.setState({
      drawOffered: true,
      drawOfferFrom: offeringColor,
    });
  }

  /**
   * Accept a draw offer
   */
  acceptDraw(): void {
    const { game, drawOffered } = this.state;
    if (!game || !drawOffered) return;
    
    game.acceptDraw();
    
    this.setState({
      timerRunning: false,
      activeTimer: null,
      drawOffered: false,
      drawOfferFrom: null,
    });
  }

  /**
   * Decline a draw offer
   */
  declineDraw(): void {
    this.setState({
      drawOffered: false,
      drawOfferFrom: null,
    });
  }

  /**
   * Handle timeout (player runs out of time)
   * @param color The color that ran out of time
   */
  handleTimeout(color: PieceColor): void {
    const { game } = this.state;
    if (!game) return;
    
    // Note: The game doesn't have a setStatus method, so we track timeout in the store
    // The game status will be checked via gameStatus getter
    // For timeout, we just stop the timer - the UI should check both game status and timeout
    
    this.setState({
      timerRunning: false,
      activeTimer: null,
    });
  }

  // ============================================
  // Screen Navigation
  // ============================================

  /**
   * Set the current screen
   * @param screen The screen to navigate to
   */
  setScreen(screen: AppState['currentScreen']): void {
    this.setState({ currentScreen: screen });
  }

  // ============================================
  // UI Actions
  // ============================================

  /**
   * Select a square on the board
   * @param position The position to select, or null to deselect
   */
  selectSquare(position: { file: number; rank: number } | null): void {
    if (!position) {
      this.setState({
        selectedSquare: null,
        validMoves: [],
      });
      return;
    }
    
    const { game } = this.state;
    if (!game) return;
    
    // Get valid moves for the selected piece
    const moves = game.getLegalMoves(position);
    const validMoves = moves.map(m => m.to);
    
    this.setState({
      selectedSquare: position,
      validMoves,
    });
  }

  /**
   * Set the piece theme
   * @param theme The theme to use
   */
  setTheme(theme: PieceTheme): void {
    this.setState({ pieceTheme: theme });
  }

  // ============================================
  // Timer Actions
  // ============================================

  /**
   * Start the timer
   */
  startTimer(): void {
    const { game } = this.state;
    if (!game) return;
    
    const currentTurn = game.currentTurn;
    
    this.setState({
      timerRunning: true,
      activeTimer: currentTurn,
    });
  }

  /**
   * Stop the timer
   */
  stopTimer(): void {
    this.setState({
      timerRunning: false,
      activeTimer: null,
    });
  }

  /**
   * Switch the active timer to the other player
   */
  switchTimer(): void {
    const { activeTimer, increment, whiteTime, blackTime } = this.state;
    if (!activeTimer) return;
    
    // Add increment to the player who just moved
    const newWhiteTime = activeTimer === PieceColor.WHITE 
      ? whiteTime + increment 
      : whiteTime;
    const newBlackTime = activeTimer === PieceColor.BLACK 
      ? blackTime + increment 
      : blackTime;
    
    const newActiveTimer = activeTimer === PieceColor.WHITE 
      ? PieceColor.BLACK 
      : PieceColor.WHITE;
    
    this.setState({
      whiteTime: newWhiteTime,
      blackTime: newBlackTime,
      activeTimer: newActiveTimer,
    });
  }

  /**
   * Update timer values
   * @param whiteTime White's remaining time
   * @param blackTime Black's remaining time
   */
  updateTimers(whiteTime: number, blackTime: number): void {
    this.setState({ whiteTime, blackTime });
  }

  // ============================================
  // Connection Actions
  // ============================================

  /**
   * Update connection state
   * @param connectionState New connection state
   */
  setConnectionState(connectionState: Partial<ConnectionState>): void {
    this.setState({
      connectionState: {
        ...this.state.connectionState,
        ...connectionState,
      },
    });
  }

  /**
   * Set the room code
   * @param roomCode The room code
   */
  setRoomCode(roomCode: string | null): void {
    this.setState({ roomCode });
  }

  /**
   * Set player names
   * @param white White player's name
   * @param black Black player's name
   */
  setPlayers(white: string, black: string): void {
    this.setState({
      players: { white, black },
    });
  }

  /**
   * Set the player's color (for online games)
   * @param color The player's color
   */
  setPlayerColor(color: PieceColor): void {
    this.setState({ playerColor: color });
  }

  // ============================================
  // Settings Actions
  // ============================================

  /**
   * Update settings
   * @param settings Partial settings to update
   */
  updateSettings(settings: {
    soundEnabled?: boolean;
    showCoordinates?: boolean;
    autoQueen?: boolean;
    confirmMoves?: boolean;
  }): void {
    this.setState(settings);
  }

  // ============================================
  // AI Actions
  // ============================================

  /**
   * Enable AI opponent
   * @param difficulty AI difficulty level
   */
  enableAI(difficulty: AIDifficulty): void {
    // Update AI game count
    const newStats = { ...this.state.gameStats };
    newStats.gamesVsAI++;
    newStats.lastUpdated = Date.now();
    
    this.setState({
      aiEnabled: true,
      aiDifficulty: difficulty,
      gameStats: newStats,
    });
  }

  /**
   * Disable AI opponent
   */
  disableAI(): void {
    this.setState({
      aiEnabled: false,
      aiThinking: false,
    });
  }

  /**
   * Set AI thinking state
   * @param thinking Whether AI is currently thinking
   */
  setAIThinking(thinking: boolean): void {
    this.setState({ aiThinking: thinking });
  }

  /**
   * Set AI difficulty
   * @param difficulty AI difficulty level
   */
  setAIDifficulty(difficulty: AIDifficulty): void {
    this.setState({ aiDifficulty: difficulty });
  }

  // ============================================
  // Coach Mode Actions
  // ============================================

  /**
   * Enable coach mode
   */
  enableCoachMode(): void {
    // Update coach game count
    const newStats = { ...this.state.gameStats };
    newStats.gamesCoach++;
    newStats.lastUpdated = Date.now();
    
    this.setState({
      coachMode: true,
      hintsEnabled: true,
      gameStats: newStats,
    });
  }

  /**
   * Disable coach mode
   */
  disableCoachMode(): void {
    this.setState({
      coachMode: false,
      hintsEnabled: false,
    });
  }

  /**
   * Toggle hints
   * @param enabled Whether hints are enabled
   */
  setHintsEnabled(enabled: boolean): void {
    this.setState({ hintsEnabled: enabled });
  }

  // ============================================
  // Analysis Actions
  // ============================================

  /**
   * Enable analysis mode
   */
  enableAnalysis(): void {
    this.setState({ analysisEnabled: true });
  }

  /**
   * Disable analysis mode
   */
  disableAnalysis(): void {
    this.setState({ analysisEnabled: false });
  }

  /**
   * Update current evaluation
   * @param evaluation Position evaluation in centipawns
   */
  setEvaluation(evaluation: number): void {
    this.setState({ currentEvaluation: evaluation });
  }

  // ============================================
  // Premove Actions
  // ============================================

  /**
   * Set a premove
   * @param move The premove to set
   */
  setPremove(move: Move | null): void {
    this.setState({ premove: move });
  }

  /**
   * Clear the current premove
   */
  clearPremove(): void {
    this.setState({ premove: null });
  }

  // ============================================
  // Game Review Actions
  // ============================================

  /**
   * Enter review mode
   */
  enterReviewMode(): void {
    const { game } = this.state;
    this.setState({
      reviewMode: true,
      reviewMoveIndex: game ? game.moveHistory.length - 1 : -1,
    });
  }

  /**
   * Exit review mode
   */
  exitReviewMode(): void {
    this.setState({
      reviewMode: false,
      reviewMoveIndex: -1,
    });
  }

  /**
   * Set the review move index
   * @param index The move index to review
   */
  setReviewMoveIndex(index: number): void {
    this.setState({ reviewMoveIndex: index });
  }

  /**
   * Go to next move in review
   */
  reviewNextMove(): void {
    const { game, reviewMoveIndex } = this.state;
    if (!game) return;
    
    const maxIndex = game.moveHistory.length - 1;
    if (reviewMoveIndex < maxIndex) {
      this.setState({ reviewMoveIndex: reviewMoveIndex + 1 });
    }
  }

  /**
   * Go to previous move in review
   */
  reviewPreviousMove(): void {
    const { reviewMoveIndex } = this.state;
    if (reviewMoveIndex > -1) {
      this.setState({ reviewMoveIndex: reviewMoveIndex - 1 });
    }
  }

  /**
   * Go to start of game in review
   */
  reviewGoToStart(): void {
    this.setState({ reviewMoveIndex: -1 });
  }

  /**
   * Go to end of game in review
   */
  reviewGoToEnd(): void {
    const { game } = this.state;
    if (!game) return;
    
    this.setState({ reviewMoveIndex: game.moveHistory.length - 1 });
  }

  // ============================================
  // Persistence
  // ============================================

  /**
   * Save settings to localStorage
   */
  saveSettings(): void {
    try {
      const settings: Record<string, unknown> = {};
      for (const key of this.persistKeys) {
        settings[key] = this.state[key];
      }
      localStorage.setItem('jemachess-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(): void {
    try {
      // Try new key first, then fall back to old key for migration
      let stored = localStorage.getItem('jemachess-settings');
      if (!stored) {
        stored = localStorage.getItem('chess-settings');
        if (stored) {
          // Migrate to new key
          localStorage.setItem('jemachess-settings', stored);
          localStorage.removeItem('chess-settings');
        }
      }
      if (stored) {
        const settings = JSON.parse(stored);
        this.state = { ...this.state, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    // Preserve game stats
    const gameStats = this.state.gameStats;
    this.state = { ...DEFAULT_STATE, gameStats };
    this.loadSettings(); // Preserve user settings
    // Clear online session when resetting
    this.clearOnlineSession();
    this.notifyListeners();
  }
  
  // ============================================
  // Online Session Persistence
  // ============================================
  
  /**
   * Save online session to localStorage
   */
  saveOnlineSession(isHost: boolean, playerName: string): void {
    const { game, roomCode, playerColor, players, whiteTime, blackTime } = this.state;
    if (!game || !roomCode) return;
    
    try {
      const session: OnlineSession = {
        roomId: roomCode,
        isHost,
        playerName,
        opponentName: isHost ? players.black : players.white,
        playerColor,
        gameFen: game.toFEN(),
        moveHistory: game.moveHistory.map(m => `${m.from.file}${m.from.rank}-${m.to.file}${m.to.rank}`),
        whiteTime,
        blackTime,
        timestamp: Date.now(),
      };
      localStorage.setItem(Store.ONLINE_SESSION_KEY, JSON.stringify(session));
      console.log('Online session saved:', session.roomId);
    } catch (error) {
      console.warn('Failed to save online session:', error);
    }
  }
  
  /**
   * Load online session from localStorage
   * @returns The session if valid, null otherwise
   */
  loadOnlineSession(): OnlineSession | null {
    try {
      const stored = localStorage.getItem(Store.ONLINE_SESSION_KEY);
      if (!stored) return null;
      
      const session: OnlineSession = JSON.parse(stored);
      
      // Check if session is expired
      if (Date.now() - session.timestamp > Store.SESSION_EXPIRY) {
        console.log('Online session expired, clearing...');
        this.clearOnlineSession();
        return null;
      }
      
      console.log('Online session loaded:', session.roomId);
      return session;
    } catch (error) {
      console.warn('Failed to load online session:', error);
      return null;
    }
  }
  
  /**
   * Clear online session from localStorage
   */
  clearOnlineSession(): void {
    try {
      localStorage.removeItem(Store.ONLINE_SESSION_KEY);
      console.log('Online session cleared');
    } catch (error) {
      console.warn('Failed to clear online session:', error);
    }
  }
  
  /**
   * Check if there's a valid online session to restore
   */
  hasOnlineSession(): boolean {
    return this.loadOnlineSession() !== null;
  }
  
  /**
   * Get game statistics
   */
  getGameStats(): GameStats {
    return { ...this.state.gameStats };
  }
  
  /**
   * Increment online games count (for tracking active online games)
   */
  incrementOnlineGames(): void {
    const newStats = { ...this.state.gameStats };
    newStats.gamesOnline++;
    newStats.lastUpdated = Date.now();
    this.setState({ gameStats: newStats });
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Global store instance
 */
export const store = new Store();

/**
 * Get the global store instance
 */
export function getStore(): Store {
  return store;
}