/**
 * RoomManager - Room Creation and Management
 * 
 * Handles room creation, joining, and player management
 * for the chess game multiplayer functionality.
 */

import { Room, RoomState, Player, PieceColor, GameConfig, TimeControl } from '../types';
import { PeerConnection, PeerConfig } from './peer-connection';
import { 
  GameMessage, 
  MessageType,
  createHelloMessage,
  createReadyMessage,
  createGameStartMessage,
  HelloMessage,
  ReadyMessage
} from './messages';

// ============================================
// Constants
// ============================================

/**
 * Characters used for generating room codes
 */
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars (0, O, 1, I)
const ROOM_CODE_LENGTH = 6;

/**
 * Default time control settings
 */
const DEFAULT_TIME_CONTROL: TimeControl = {
  initial: 600, // 10 minutes
  increment: 0,
};

/**
 * Default game configuration
 */
const DEFAULT_GAME_CONFIG: GameConfig = {
  timeControl: DEFAULT_TIME_CONTROL,
  hostColor: 'random',
};

// ============================================
// RoomManager Class
// ============================================

/**
 * RoomManager class for handling room creation and joining
 */
export class RoomManager {
  private peerConnection: PeerConnection;
  private currentRoom: Room | null = null;
  private localPlayer: Player | null = null;
  private remotePlayer: Player | null = null;
  private gameConfig: GameConfig = { ...DEFAULT_GAME_CONFIG };
  
  // Event callbacks
  public onPlayerJoined: ((player: Player) => void) | null = null;
  public onPlayerLeft: ((playerId: string) => void) | null = null;
  public onPlayerReady: ((player: Player) => void) | null = null;
  public onGameStart: ((hostColor: PieceColor, guestColor: PieceColor) => void) | null = null;
  public onRoomStateChange: ((room: Room) => void) | null = null;
  public onError: ((error: Error) => void) | null = null;
  
  /**
   * Create a new RoomManager instance
   */
  constructor(peerConfig?: PeerConfig) {
    this.peerConnection = new PeerConnection(peerConfig);
    this.setupPeerCallbacks();
  }
  
  // ============================================
  // Public Methods
  // ============================================
  
  /**
   * Generate a random 6-character room code
   */
  generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
      code += ROOM_CODE_CHARS[randomIndex];
    }
    return code;
  }
  
  /**
   * Create a new room as host
   */
  async createRoom(playerName: string, config?: Partial<GameConfig>): Promise<Room> {
    // Merge config with defaults
    this.gameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
    };
    
    // Create local player
    this.localPlayer = {
      id: '', // Will be set after peer connection
      name: playerName,
      color: null, // Will be assigned when game starts
      isReady: false,
      isConnected: true,
    };
    
    try {
      // Create peer connection and get room ID
      const roomId = await this.peerConnection.createRoom();
      
      // Update local player ID
      this.localPlayer.id = roomId;
      
      // Create room object
      this.currentRoom = {
        id: roomId,
        hostId: roomId,
        createdAt: Date.now(),
        config: this.gameConfig,
        state: RoomState.WAITING,
      };
      
      this.notifyRoomStateChange();
      
      return this.currentRoom;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Join an existing room as guest
   */
  async joinRoom(roomCode: string, playerName: string): Promise<Room> {
    // Normalize room code - keep case for UUID compatibility
    const normalizedCode = roomCode.trim();
    
    // Create local player
    this.localPlayer = {
      id: '', // Will be set after peer connection
      name: playerName,
      color: null,
      isReady: false,
      isConnected: true,
    };
    
    try {
      // Join the room via peer connection
      await this.peerConnection.joinRoom(normalizedCode);
      
      // Update local player ID
      this.localPlayer.id = this.peerConnection.getPeerId();
      
      // Create room object (will be updated when we receive host info)
      this.currentRoom = {
        id: normalizedCode,
        hostId: normalizedCode,
        guestId: this.localPlayer.id,
        createdAt: Date.now(),
        config: { ...DEFAULT_GAME_CONFIG },
        state: RoomState.WAITING,
      };
      
      // Send hello message to host
      const helloMessage = createHelloMessage(
        this.localPlayer.id,
        playerName,
        '1.0.0'
      );
      this.peerConnection.send(helloMessage);
      
      this.notifyRoomStateChange();
      
      return this.currentRoom;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Leave the current room
   */
  leaveRoom(): void {
    this.peerConnection.disconnect();
    this.currentRoom = null;
    this.localPlayer = null;
    this.remotePlayer = null;
  }
  
  /**
   * Set local player as ready
   */
  setReady(ready: boolean = true): void {
    if (!this.localPlayer || !this.currentRoom) {
      console.warn('Cannot set ready: not in a room');
      return;
    }
    
    this.localPlayer.isReady = ready;
    
    // Determine player color based on host config
    let playerColor: PieceColor;
    if (this.peerConnection.getIsHost()) {
      playerColor = this.determineHostColor();
    } else {
      // Guest gets opposite color of host
      playerColor = this.localPlayer.color || PieceColor.BLACK;
    }
    
    // Send ready message
    const readyMessage = createReadyMessage(this.localPlayer.id, playerColor);
    this.peerConnection.send(readyMessage);
    
    // Check if both players are ready
    this.checkGameStart();
  }
  
  /**
   * Get the current room
   */
  getCurrentRoom(): Room | null {
    return this.currentRoom ? { ...this.currentRoom } : null;
  }
  
  /**
   * Get the local player
   */
  getLocalPlayer(): Player | null {
    return this.localPlayer ? { ...this.localPlayer } : null;
  }
  
  /**
   * Get the remote player
   */
  getRemotePlayer(): Player | null {
    return this.remotePlayer ? { ...this.remotePlayer } : null;
  }
  
  /**
   * Check if local player is the host
   */
  isHost(): boolean {
    return this.peerConnection.getIsHost();
  }
  
  /**
   * Get the peer connection instance
   */
  getPeerConnection(): PeerConnection {
    return this.peerConnection;
  }
  
  /**
   * Get the room code (formatted for display)
   */
  getRoomCode(): string {
    if (!this.currentRoom) return '';
    
    // Format as XXX-XXX for easier reading
    const code = this.currentRoom.id;
    if (code.length === 6) {
      return `${code.slice(0, 3)}-${code.slice(3)}`;
    }
    return code;
  }
  
  // ============================================
  // Private Methods - Setup
  // ============================================
  
  /**
   * Setup callbacks for peer connection events
   */
  private setupPeerCallbacks(): void {
    this.peerConnection.onConnected = (peerId: string) => {
      this.handlePeerConnected(peerId);
    };
    
    this.peerConnection.onDisconnected = (reason: string) => {
      this.handlePeerDisconnected(reason);
    };
    
    this.peerConnection.onMessage = (message: GameMessage) => {
      this.handleMessage(message);
    };
    
    this.peerConnection.onError = (error: Error) => {
      this.handleError(error);
    };
  }
  
  // ============================================
  // Private Methods - Event Handlers
  // ============================================
  
  /**
   * Handle peer connected event
   */
  private handlePeerConnected(peerId: string): void {
    if (this.peerConnection.getIsHost() && this.currentRoom) {
      // Host received a connection from guest
      this.currentRoom.guestId = peerId;
      
      // Send hello message to guest
      if (this.localPlayer) {
        const helloMessage = createHelloMessage(
          this.localPlayer.id,
          this.localPlayer.name,
          '1.0.0'
        );
        this.peerConnection.send(helloMessage);
      }
      
      this.notifyRoomStateChange();
    }
  }
  
  /**
   * Handle peer disconnected event
   */
  private handlePeerDisconnected(reason: string): void {
    if (this.remotePlayer) {
      const playerId = this.remotePlayer.id;
      this.remotePlayer.isConnected = false;
      this.onPlayerLeft?.(playerId);
    }
    
    if (this.currentRoom) {
      this.currentRoom.state = RoomState.WAITING;
      this.notifyRoomStateChange();
    }
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(message: GameMessage): void {
    switch (message.type) {
      case MessageType.HELLO:
        this.handleHelloMessage(message as HelloMessage);
        break;
      case MessageType.READY:
        this.handleReadyMessage(message as ReadyMessage);
        break;
      case MessageType.GAME_START:
        // Game start is handled by GameSync
        break;
      default:
        // Other messages are handled by GameSync
        break;
    }
  }
  
  /**
   * Handle HELLO message
   */
  private handleHelloMessage(message: HelloMessage): void {
    // Create remote player from hello message
    this.remotePlayer = {
      id: message.senderId,
      name: message.playerName,
      color: null,
      isReady: false,
      isConnected: true,
    };
    
    // Update room state
    if (this.currentRoom) {
      this.currentRoom.state = RoomState.WAITING;
      this.notifyRoomStateChange();
    }
    
    this.onPlayerJoined?.(this.remotePlayer);
  }
  
  /**
   * Handle READY message
   */
  private handleReadyMessage(message: ReadyMessage): void {
    if (this.remotePlayer) {
      this.remotePlayer.isReady = true;
      this.remotePlayer.color = message.playerColor;
      
      // If we're the guest, set our color to opposite
      if (!this.peerConnection.getIsHost() && this.localPlayer) {
        this.localPlayer.color = message.playerColor === PieceColor.WHITE 
          ? PieceColor.BLACK 
          : PieceColor.WHITE;
      }
      
      this.onPlayerReady?.(this.remotePlayer);
      
      // Check if both players are ready
      this.checkGameStart();
    }
  }
  
  // ============================================
  // Private Methods - Game Logic
  // ============================================
  
  /**
   * Determine host's color based on config
   */
  private determineHostColor(): PieceColor {
    if (this.gameConfig.hostColor === 'random') {
      return Math.random() < 0.5 ? PieceColor.WHITE : PieceColor.BLACK;
    }
    return this.gameConfig.hostColor;
  }
  
  /**
   * Check if both players are ready and start the game
   */
  private checkGameStart(): void {
    if (!this.currentRoom || !this.localPlayer || !this.remotePlayer) {
      return;
    }
    
    if (this.localPlayer.isReady && this.remotePlayer.isReady) {
      // Both players are ready
      this.currentRoom.state = RoomState.READY;
      this.notifyRoomStateChange();
      
      // Only host sends game start message
      if (this.peerConnection.getIsHost()) {
        const hostColor = this.localPlayer.color || this.determineHostColor();
        const guestColor = hostColor === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
        
        // Update local player color
        this.localPlayer.color = hostColor;
        
        // Initial FEN for standard chess starting position
        const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        // Send game start message
        const gameStartMessage = createGameStartMessage(
          this.localPlayer.id,
          hostColor,
          guestColor,
          initialFen,
          this.gameConfig.timeControl
        );
        this.peerConnection.send(gameStartMessage);
        
        // Update room state
        this.currentRoom.state = RoomState.PLAYING;
        this.notifyRoomStateChange();
        
        // Notify callback
        this.onGameStart?.(hostColor, guestColor);
      }
    }
  }
  
  // ============================================
  // Private Methods - Utilities
  // ============================================
  
  /**
   * Notify room state change
   */
  private notifyRoomStateChange(): void {
    if (this.currentRoom) {
      this.onRoomStateChange?.({ ...this.currentRoom });
    }
  }
  
  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('RoomManager error:', error);
    this.onError?.(error);
  }
}