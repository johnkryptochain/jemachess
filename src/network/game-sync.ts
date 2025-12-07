/**
 * GameSync - Game State Synchronization
 * 
 * Handles synchronization of game state between peers,
 * including move validation, conflict resolution, and state recovery.
 */

import { Move, GameState, PieceColor, GameStatus, PieceType, Position } from '../types';
import { PeerConnection } from './peer-connection';
import {
  GameMessage,
  MessageType,
  MoveMessage,
  MoveAckMessage,
  MoveRejectMessage,
  StateRequestMessage,
  StateResponseMessage,
  GameStartMessage,
  GameEndMessage,
  ResignMessage,
  DrawOfferMessage,
  DrawAcceptMessage,
  DrawDeclineMessage,
  createMoveMessage,
  createMoveAckMessage,
  createMoveRejectMessage,
  createStateRequestMessage,
  createStateResponseMessage,
  createGameEndMessage,
  createResignMessage,
  createDrawOfferMessage,
  createDrawAcceptMessage,
  createDrawDeclineMessage,
} from './messages';

// ============================================
// Types
// ============================================

/**
 * Simplified move representation for network transmission
 */
export interface NetworkMove {
  from: Position;
  to: Position;
  promotion?: PieceType;
}

/**
 * Pending move awaiting acknowledgment
 */
interface PendingMove {
  move: NetworkMove;
  moveNumber: number;
  timestamp: number;
  fen: string;
  retryCount: number;
}

/**
 * Game sync configuration
 */
export interface GameSyncConfig {
  moveTimeout: number;
  maxRetries: number;
  syncInterval: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: GameSyncConfig = {
  moveTimeout: 5000, // 5 seconds
  maxRetries: 3,
  syncInterval: 30000, // 30 seconds
};

// ============================================
// GameSync Class
// ============================================

/**
 * GameSync class for synchronizing game state between peers
 */
export class GameSync {
  private peerConnection: PeerConnection;
  private config: GameSyncConfig;
  
  // Game state
  private localColor: PieceColor | null = null;
  private currentMoveNumber: number = 0;
  private currentFen: string = '';
  private moveHistory: NetworkMove[] = [];
  
  // Pending moves
  private pendingMoves: Map<number, PendingMove> = new Map();
  private moveTimeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();
  
  // Draw offer state
  private pendingDrawOffer: boolean = false;
  private drawOfferFrom: PieceColor | null = null;
  
  // Sync state
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: number = 0;
  
  // Event callbacks
  public onMoveReceived: ((move: NetworkMove, moveNumber: number) => void) | null = null;
  public onMoveAcknowledged: ((moveNumber: number) => void) | null = null;
  public onMoveRejected: ((moveNumber: number, reason: string) => void) | null = null;
  public onSyncComplete: (() => void) | null = null;
  public onConflict: ((localMove: NetworkMove, remoteMove: NetworkMove) => NetworkMove) | null = null;
  public onGameStart: ((hostColor: PieceColor, guestColor: PieceColor, initialFen: string) => void) | null = null;
  public onGameEnd: ((status: GameStatus, winner: PieceColor | null, reason: string) => void) | null = null;
  public onResign: ((resigningColor: PieceColor) => void) | null = null;
  public onDrawOffer: ((offeringColor: PieceColor) => void) | null = null;
  public onDrawAccepted: (() => void) | null = null;
  public onDrawDeclined: (() => void) | null = null;
  public onStateSync: ((fen: string, moveHistory: NetworkMove[], moveNumber: number) => void) | null = null;
  public onError: ((error: Error) => void) | null = null;
  
  /**
   * Create a new GameSync instance
   */
  constructor(peerConnection: PeerConnection, config?: Partial<GameSyncConfig>) {
    this.peerConnection = peerConnection;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupMessageHandler();
  }
  
  // ============================================
  // Public Methods - Initialization
  // ============================================
  
  /**
   * Initialize game sync with player color
   */
  initialize(localColor: PieceColor, initialFen: string): void {
    this.localColor = localColor;
    this.currentFen = initialFen;
    this.currentMoveNumber = 0;
    this.moveHistory = [];
    this.pendingMoves.clear();
    this.clearAllTimeouts();
    this.startPeriodicSync();
  }
  
  /**
   * Reset game sync state
   */
  reset(): void {
    this.localColor = null;
    this.currentMoveNumber = 0;
    this.currentFen = '';
    this.moveHistory = [];
    this.pendingMoves.clear();
    this.clearAllTimeouts();
    this.stopPeriodicSync();
    this.pendingDrawOffer = false;
    this.drawOfferFrom = null;
  }
  
  // ============================================
  // Public Methods - Move Operations
  // ============================================
  
  /**
   * Send a move to the opponent
   */
  sendMove(move: NetworkMove, newFen: string): void {
    const moveNumber = ++this.currentMoveNumber;
    
    // Create pending move
    const pendingMove: PendingMove = {
      move,
      moveNumber,
      timestamp: Date.now(),
      fen: newFen,
      retryCount: 0,
    };
    
    this.pendingMoves.set(moveNumber, pendingMove);
    
    // Send move message
    const message = createMoveMessage(
      this.peerConnection.getPeerId(),
      {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      },
      moveNumber,
      newFen
    );
    
    this.peerConnection.send(message);
    
    // Set timeout for acknowledgment
    this.setMoveTimeout(moveNumber);
    
    // Update local state
    this.currentFen = newFen;
    this.moveHistory.push(move);
  }
  
  /**
   * Request full state sync from peer
   */
  requestStateSync(): void {
    const message = createStateRequestMessage(
      this.peerConnection.getPeerId(),
      this.currentMoveNumber
    );
    
    this.peerConnection.send(message);
  }
  
  /**
   * Send full state to peer
   */
  sendStateSync(
    fen: string,
    moveHistory: NetworkMove[],
    moveNumber: number,
    whiteTime: number,
    blackTime: number,
    status: GameStatus
  ): void {
    const message = createStateResponseMessage(
      this.peerConnection.getPeerId(),
      fen,
      moveHistory.map(m => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
      })),
      moveNumber,
      whiteTime,
      blackTime,
      status
    );
    
    this.peerConnection.send(message);
  }
  
  // ============================================
  // Public Methods - Game Control
  // ============================================
  
  /**
   * Send resignation
   */
  sendResign(): void {
    if (!this.localColor) return;
    
    const message = createResignMessage(
      this.peerConnection.getPeerId(),
      this.localColor
    );
    
    this.peerConnection.send(message);
  }
  
  /**
   * Send draw offer
   */
  sendDrawOffer(): void {
    if (!this.localColor || this.pendingDrawOffer) return;
    
    this.pendingDrawOffer = true;
    
    const message = createDrawOfferMessage(
      this.peerConnection.getPeerId(),
      this.localColor
    );
    
    this.peerConnection.send(message);
  }
  
  /**
   * Accept draw offer
   */
  acceptDrawOffer(): void {
    if (!this.drawOfferFrom) return;
    
    const message = createDrawAcceptMessage(this.peerConnection.getPeerId());
    this.peerConnection.send(message);
    
    this.drawOfferFrom = null;
    this.pendingDrawOffer = false;
  }
  
  /**
   * Decline draw offer
   */
  declineDrawOffer(): void {
    if (!this.drawOfferFrom) return;
    
    const message = createDrawDeclineMessage(this.peerConnection.getPeerId());
    this.peerConnection.send(message);
    
    this.drawOfferFrom = null;
  }
  
  /**
   * Send game end notification
   */
  sendGameEnd(status: GameStatus, winner: PieceColor | null, reason: string): void {
    const message = createGameEndMessage(
      this.peerConnection.getPeerId(),
      status,
      winner,
      reason
    );
    
    this.peerConnection.send(message);
  }
  
  // ============================================
  // Public Methods - State Queries
  // ============================================
  
  /**
   * Get current move number
   */
  getCurrentMoveNumber(): number {
    return this.currentMoveNumber;
  }
  
  /**
   * Get current FEN
   */
  getCurrentFen(): string {
    return this.currentFen;
  }
  
  /**
   * Get move history
   */
  getMoveHistory(): NetworkMove[] {
    return [...this.moveHistory];
  }
  
  /**
   * Check if there's a pending draw offer
   */
  hasPendingDrawOffer(): boolean {
    return this.pendingDrawOffer;
  }
  
  /**
   * Get the color that offered a draw
   */
  getDrawOfferFrom(): PieceColor | null {
    return this.drawOfferFrom;
  }
  
  // ============================================
  // Private Methods - Message Handling
  // ============================================
  
  /**
   * Setup message handler for peer connection
   */
  private setupMessageHandler(): void {
    // Store original handler if exists
    const originalHandler = this.peerConnection.onMessage;
    
    this.peerConnection.onMessage = (message: GameMessage) => {
      // Handle game sync messages
      if (this.handleMessage(message)) {
        return;
      }
      
      // Forward to original handler
      originalHandler?.(message);
    };
  }
  
  /**
   * Handle incoming message
   * Returns true if message was handled
   */
  private handleMessage(message: GameMessage): boolean {
    switch (message.type) {
      case MessageType.GAME_START:
        this.handleGameStart(message as GameStartMessage);
        return true;
        
      case MessageType.GAME_END:
        this.handleGameEnd(message as GameEndMessage);
        return true;
        
      case MessageType.MOVE:
        this.handleMove(message as MoveMessage);
        return true;
        
      case MessageType.MOVE_ACK:
        this.handleMoveAck(message as MoveAckMessage);
        return true;
        
      case MessageType.MOVE_REJECT:
        this.handleMoveReject(message as MoveRejectMessage);
        return true;
        
      case MessageType.STATE_REQUEST:
        this.handleStateRequest(message as StateRequestMessage);
        return true;
        
      case MessageType.STATE_RESPONSE:
        this.handleStateResponse(message as StateResponseMessage);
        return true;
        
      case MessageType.RESIGN:
        this.handleResign(message as ResignMessage);
        return true;
        
      case MessageType.DRAW_OFFER:
        this.handleDrawOffer(message as DrawOfferMessage);
        return true;
        
      case MessageType.DRAW_ACCEPT:
        this.handleDrawAccept();
        return true;
        
      case MessageType.DRAW_DECLINE:
        this.handleDrawDecline();
        return true;
        
      default:
        return false;
    }
  }
  
  /**
   * Handle GAME_START message
   */
  private handleGameStart(message: GameStartMessage): void {
    this.onGameStart?.(message.hostColor, message.guestColor, message.initialFen);
  }
  
  /**
   * Handle GAME_END message
   */
  private handleGameEnd(message: GameEndMessage): void {
    this.onGameEnd?.(message.status, message.winner, message.reason);
    this.reset();
  }
  
  /**
   * Handle incoming MOVE message
   */
  private handleMove(message: MoveMessage): void {
    const { move, moveNumber, fen } = message;
    
    // Check for move number conflicts
    if (moveNumber <= this.currentMoveNumber) {
      // Duplicate or old move, send ack anyway
      const ackMessage = createMoveAckMessage(
        this.peerConnection.getPeerId(),
        moveNumber,
        this.currentFen
      );
      this.peerConnection.send(ackMessage);
      return;
    }
    
    // Check for concurrent moves (conflict)
    const pendingMove = this.pendingMoves.get(moveNumber);
    if (pendingMove) {
      // Both players sent a move with the same number
      // Resolve conflict
      const resolvedMove = this.resolveConflict(pendingMove.move, move);
      
      // Clear pending move
      this.clearMoveTimeout(moveNumber);
      this.pendingMoves.delete(moveNumber);
      
      // Notify about conflict resolution
      this.onConflict?.(pendingMove.move, move);
      
      // Use resolved move
      this.currentMoveNumber = moveNumber;
      this.currentFen = fen;
      this.moveHistory.push(resolvedMove);
      
      // Send ack
      const ackMessage = createMoveAckMessage(
        this.peerConnection.getPeerId(),
        moveNumber,
        fen
      );
      this.peerConnection.send(ackMessage);
      
      this.onMoveReceived?.(resolvedMove, moveNumber);
      return;
    }
    
    // Normal move processing
    this.currentMoveNumber = moveNumber;
    this.currentFen = fen;
    this.moveHistory.push(move);
    
    // Send acknowledgment
    const ackMessage = createMoveAckMessage(
      this.peerConnection.getPeerId(),
      moveNumber,
      fen
    );
    this.peerConnection.send(ackMessage);
    
    // Notify callback
    this.onMoveReceived?.(move, moveNumber);
  }
  
  /**
   * Handle MOVE_ACK message
   */
  private handleMoveAck(message: MoveAckMessage): void {
    const { moveNumber, fen } = message;
    
    // Clear timeout and pending move
    this.clearMoveTimeout(moveNumber);
    this.pendingMoves.delete(moveNumber);
    
    // Verify FEN matches
    if (fen !== this.currentFen) {
      console.warn('FEN mismatch after move ack, requesting sync');
      this.requestStateSync();
      return;
    }
    
    this.onMoveAcknowledged?.(moveNumber);
  }
  
  /**
   * Handle MOVE_REJECT message
   */
  private handleMoveReject(message: MoveRejectMessage): void {
    const { moveNumber, reason, expectedFen } = message;
    
    // Clear timeout and pending move
    this.clearMoveTimeout(moveNumber);
    const pendingMove = this.pendingMoves.get(moveNumber);
    this.pendingMoves.delete(moveNumber);
    
    // Rollback local state
    if (pendingMove) {
      this.currentMoveNumber = moveNumber - 1;
      this.moveHistory.pop();
    }
    
    // Request state sync to recover
    this.requestStateSync();
    
    this.onMoveRejected?.(moveNumber, reason);
  }
  
  /**
   * Handle STATE_REQUEST message
   */
  private handleStateRequest(message: StateRequestMessage): void {
    // This should be handled by the game logic layer
    // which has access to full game state including timers
    // For now, just send current known state
    this.sendStateSync(
      this.currentFen,
      this.moveHistory,
      this.currentMoveNumber,
      0, // Time should come from game logic
      0,
      GameStatus.IN_PROGRESS
    );
  }
  
  /**
   * Handle STATE_RESPONSE message
   */
  private handleStateResponse(message: StateResponseMessage): void {
    const { fen, moveHistory, currentMoveNumber, status } = message;
    
    // Update local state
    this.currentFen = fen;
    this.currentMoveNumber = currentMoveNumber;
    this.moveHistory = moveHistory.map(m => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    }));
    
    // Clear any pending moves
    this.pendingMoves.clear();
    this.clearAllTimeouts();
    
    this.lastSyncTime = Date.now();
    
    // Notify callback
    this.onStateSync?.(fen, this.moveHistory, currentMoveNumber);
    this.onSyncComplete?.();
  }
  
  /**
   * Handle RESIGN message
   */
  private handleResign(message: ResignMessage): void {
    this.onResign?.(message.resigningColor);
  }
  
  /**
   * Handle DRAW_OFFER message
   */
  private handleDrawOffer(message: DrawOfferMessage): void {
    this.drawOfferFrom = message.offeringColor;
    this.onDrawOffer?.(message.offeringColor);
  }
  
  /**
   * Handle DRAW_ACCEPT message
   */
  private handleDrawAccept(): void {
    this.pendingDrawOffer = false;
    this.drawOfferFrom = null;
    this.onDrawAccepted?.();
  }
  
  /**
   * Handle DRAW_DECLINE message
   */
  private handleDrawDecline(): void {
    this.pendingDrawOffer = false;
    this.onDrawDeclined?.();
  }
  
  // ============================================
  // Private Methods - Conflict Resolution
  // ============================================
  
  /**
   * Resolve conflict between two concurrent moves
   * Uses timestamp as tiebreaker - earlier move wins
   */
  private resolveConflict(localMove: NetworkMove, remoteMove: NetworkMove): NetworkMove {
    // If callback is provided, use it for custom resolution
    if (this.onConflict) {
      return this.onConflict(localMove, remoteMove);
    }
    
    // Default: use the move from the player whose turn it is
    // This should be determined by the game logic
    // For now, prefer remote move (assume they sent first)
    return remoteMove;
  }
  
  // ============================================
  // Private Methods - Timeout Management
  // ============================================
  
  /**
   * Set timeout for move acknowledgment
   */
  private setMoveTimeout(moveNumber: number): void {
    const timeout = setTimeout(() => {
      this.handleMoveTimeout(moveNumber);
    }, this.config.moveTimeout);
    
    this.moveTimeouts.set(moveNumber, timeout);
  }
  
  /**
   * Clear timeout for a specific move
   */
  private clearMoveTimeout(moveNumber: number): void {
    const timeout = this.moveTimeouts.get(moveNumber);
    if (timeout) {
      clearTimeout(timeout);
      this.moveTimeouts.delete(moveNumber);
    }
  }
  
  /**
   * Clear all move timeouts
   */
  private clearAllTimeouts(): void {
    for (const timeout of this.moveTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.moveTimeouts.clear();
  }
  
  /**
   * Handle move timeout - retry or fail
   */
  private handleMoveTimeout(moveNumber: number): void {
    const pendingMove = this.pendingMoves.get(moveNumber);
    if (!pendingMove) return;
    
    if (pendingMove.retryCount < this.config.maxRetries) {
      // Retry sending the move
      pendingMove.retryCount++;
      
      const message = createMoveMessage(
        this.peerConnection.getPeerId(),
        {
          from: pendingMove.move.from,
          to: pendingMove.move.to,
          promotion: pendingMove.move.promotion,
        },
        moveNumber,
        pendingMove.fen
      );
      
      this.peerConnection.send(message);
      this.setMoveTimeout(moveNumber);
      
      console.log(`Retrying move ${moveNumber}, attempt ${pendingMove.retryCount}`);
    } else {
      // Max retries reached, request state sync
      console.warn(`Move ${moveNumber} failed after ${this.config.maxRetries} retries`);
      this.pendingMoves.delete(moveNumber);
      this.requestStateSync();
      
      this.onError?.(new Error(`Move ${moveNumber} failed: timeout`));
    }
  }
  
  // ============================================
  // Private Methods - Periodic Sync
  // ============================================
  
  /**
   * Start periodic state sync
   */
  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    
    this.syncInterval = setInterval(() => {
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      
      if (timeSinceLastSync > this.config.syncInterval) {
        this.requestStateSync();
      }
    }, this.config.syncInterval);
  }
  
  /**
   * Stop periodic state sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}