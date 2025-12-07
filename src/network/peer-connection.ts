/**
 * PeerConnection - WebRTC Peer Connection Wrapper
 * 
 * Wraps PeerJS library to provide a clean interface for
 * peer-to-peer connections in the chess game.
 */

import Peer, { DataConnection, PeerOptions } from 'peerjs';
import { ConnectionStatus, ConnectionState } from '../types';
import { 
  GameMessage, 
  deserializeMessage, 
  serializeMessage,
  createPingMessage,
  createPongMessage,
  MessageType
} from './messages';

// ============================================
// Configuration
// ============================================

/**
 * PeerJS configuration options
 */
export type PeerConfig = PeerOptions;

/**
 * Default PeerJS configuration (uses free PeerJS cloud server)
 */
const DEFAULT_PEER_CONFIG: PeerConfig = {
  debug: 1, // 0 = no logs, 1 = errors, 2 = warnings, 3 = all
};

/**
 * Connection timeouts and intervals
 */
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 30000; // Increased from 15s to 30s for unstable connections
const RECONNECT_BASE_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// ============================================
// PeerConnection Class
// ============================================

/**
 * PeerConnection class wrapping PeerJS for WebRTC communication
 */
export class PeerConnection {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private roomId: string = '';
  private isHost: boolean = false;
  private peerId: string = '';
  
  // Heartbeat management
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;
  private pingSequence: number = 0;
  private pendingPings: Map<number, number> = new Map();
  private latency: number = 0;
  
  // Reconnection management
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean = false;
  private lastKnownPeerId: string = '';
  
  // Connection state
  private connectionState: ConnectionState = {
    status: ConnectionStatus.DISCONNECTED,
    peerId: null,
    roomId: null,
    opponentId: null,
    opponentName: null,
    latency: 0,
    lastHeartbeat: 0,
  };
  
  // Event callbacks
  public onConnected: ((peerId: string) => void) | null = null;
  public onDisconnected: ((reason: string) => void) | null = null;
  public onMessage: ((message: GameMessage) => void) | null = null;
  public onError: ((error: Error) => void) | null = null;
  public onStateChange: ((state: ConnectionState) => void) | null = null;
  public onLatencyUpdate: ((latency: number) => void) | null = null;
  
  /**
   * Create a new PeerConnection instance
   */
  constructor(private config: PeerConfig = DEFAULT_PEER_CONFIG) {}
  
  // ============================================
  // Public Methods
  // ============================================
  
  /**
   * Create a new room as host
   * Returns the room ID (which is the peer ID)
   */
  async createRoom(): Promise<string> {
    this.isHost = true;
    this.updateState({ status: ConnectionStatus.CONNECTING });
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout while creating room'));
        this.cleanup();
      }, CONNECTION_TIMEOUT);
      
      try {
        // Create peer with random ID
        this.peer = new Peer(this.config);
        
        this.peer.on('open', (id: string) => {
          clearTimeout(timeoutId);
          this.peerId = id;
          this.roomId = id; // Room ID is the host's peer ID
          
          this.updateState({
            status: ConnectionStatus.CONNECTED,
            peerId: id,
            roomId: id,
          });
          
          this.setupHostListeners();
          resolve(id);
        });
        
        this.peer.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          this.handleError(err);
          reject(err);
        });
        
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Join an existing room as guest
   */
  async joinRoom(roomId: string): Promise<void> {
    this.isHost = false;
    this.roomId = roomId;
    this.lastKnownPeerId = roomId;
    this.updateState({ status: ConnectionStatus.CONNECTING, roomId });
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout while joining room'));
        this.cleanup();
      }, CONNECTION_TIMEOUT);
      
      try {
        // Create peer with random ID
        this.peer = new Peer(this.config);
        
        this.peer.on('open', (id: string) => {
          this.peerId = id;
          this.updateState({ peerId: id });
          
          // Connect to the host
          this.connection = this.peer!.connect(roomId, {
            reliable: true,
          });
          
          this.setupConnectionListeners(this.connection, () => {
            clearTimeout(timeoutId);
            this.updateState({
              status: ConnectionStatus.CONNECTED,
              opponentId: roomId,
            });
            this.startHeartbeat();
            resolve();
          });
        });
        
        this.peer.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          this.handleError(err);
          reject(err);
        });
        
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Send a message to the connected peer
   */
  send(message: GameMessage): void {
    if (!this.connection || !this.isConnected()) {
      console.warn('Cannot send message: not connected');
      return;
    }
    
    try {
      const serialized = serializeMessage(message);
      this.connection.send(serialized);
    } catch (error) {
      console.error('Error sending message:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Disconnect from the current connection
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.updateState({
      status: ConnectionStatus.DISCONNECTED,
      opponentId: null,
      opponentName: null,
    });
    this.onDisconnected?.('User disconnected');
  }
  
  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
  
  /**
   * Check if currently connected to a peer
   */
  isConnected(): boolean {
    return (
      this.connectionState.status === ConnectionStatus.CONNECTED &&
      this.connection !== null &&
      this.connection.open
    );
  }
  
  /**
   * Get the current room ID
   */
  getRoomId(): string {
    return this.roomId;
  }
  
  /**
   * Get the local peer ID
   */
  getPeerId(): string {
    return this.peerId;
  }
  
  /**
   * Check if this peer is the host
   */
  getIsHost(): boolean {
    return this.isHost;
  }
  
  /**
   * Get current latency in milliseconds
   */
  getLatency(): number {
    return this.latency;
  }
  
  // ============================================
  // Private Methods - Setup
  // ============================================
  
  /**
   * Setup listeners for host peer
   */
  private setupHostListeners(): void {
    if (!this.peer) return;
    
    this.peer.on('connection', (conn: DataConnection) => {
      // Only accept one connection
      if (this.connection) {
        conn.close();
        return;
      }
      
      this.connection = conn;
      this.setupConnectionListeners(conn, () => {
        this.updateState({
          status: ConnectionStatus.CONNECTED,
          opponentId: conn.peer,
        });
        this.startHeartbeat();
        this.onConnected?.(conn.peer);
      });
    });
    
    this.peer.on('disconnected', () => {
      this.handlePeerDisconnected();
    });
  }
  
  /**
   * Setup listeners for a data connection
   */
  private setupConnectionListeners(
    conn: DataConnection,
    onOpen: () => void
  ): void {
    conn.on('open', () => {
      onOpen();
    });
    
    conn.on('data', (data: unknown) => {
      this.handleIncomingData(data);
    });
    
    conn.on('close', () => {
      this.handleConnectionClosed();
    });
    
    conn.on('error', (err: Error) => {
      this.handleError(err);
    });
  }
  
  // ============================================
  // Private Methods - Message Handling
  // ============================================
  
  /**
   * Handle incoming data from peer
   */
  private handleIncomingData(data: unknown): void {
    if (typeof data !== 'string') {
      console.warn('Received non-string data:', data);
      return;
    }
    
    const message = deserializeMessage(data);
    if (!message) {
      console.warn('Failed to deserialize message:', data);
      return;
    }
    
    // Handle internal messages
    if (message.type === MessageType.PING) {
      this.handlePing(message);
      return;
    }
    
    if (message.type === MessageType.PONG) {
      this.handlePong(message);
      return;
    }
    
    // Forward other messages to callback
    this.onMessage?.(message);
  }
  
  /**
   * Handle incoming ping message
   */
  private handlePing(message: GameMessage): void {
    if (message.type !== MessageType.PING) return;
    
    const pong = createPongMessage(
      this.peerId,
      message.sequence,
      message.timestamp
    );
    this.send(pong);
    
    this.lastHeartbeat = Date.now();
    this.updateState({ lastHeartbeat: this.lastHeartbeat });
  }
  
  /**
   * Handle incoming pong message
   */
  private handlePong(message: GameMessage): void {
    if (message.type !== MessageType.PONG) return;
    
    const sentTime = this.pendingPings.get(message.sequence);
    if (sentTime) {
      this.latency = Date.now() - sentTime;
      this.pendingPings.delete(message.sequence);
      this.updateState({ latency: this.latency });
      this.onLatencyUpdate?.(this.latency);
    }
    
    this.lastHeartbeat = Date.now();
    this.updateState({ lastHeartbeat: this.lastHeartbeat });
  }
  
  // ============================================
  // Private Methods - Heartbeat
  // ============================================
  
  /**
   * Start the heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
      this.checkHeartbeatTimeout();
    }, HEARTBEAT_INTERVAL);
  }
  
  /**
   * Stop the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.pendingPings.clear();
  }
  
  /**
   * Send a ping message
   */
  private sendPing(): void {
    if (!this.isConnected()) return;
    
    const sequence = ++this.pingSequence;
    const ping = createPingMessage(this.peerId, sequence);
    
    this.pendingPings.set(sequence, Date.now());
    this.send(ping);
    
    // Clean up old pending pings
    const now = Date.now();
    for (const [seq, time] of this.pendingPings) {
      if (now - time > HEARTBEAT_TIMEOUT) {
        this.pendingPings.delete(seq);
      }
    }
  }
  
  /**
   * Check if heartbeat has timed out
   */
  private checkHeartbeatTimeout(): void {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    
    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.warn('Heartbeat timeout, connection may be lost');
      this.handleConnectionClosed();
    }
  }
  
  // ============================================
  // Private Methods - Reconnection
  // ============================================
  
  /**
   * Handle peer disconnection from signaling server
   * This is called when the peer loses connection to the PeerJS signaling server,
   * NOT when the data connection to the opponent closes.
   */
  private handlePeerDisconnected(): void {
    // Only attempt to reconnect to signaling server if we're actually disconnected
    // and reconnection is enabled
    if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.updateState({ status: ConnectionStatus.RECONNECTING });
      this.attemptSignalingReconnect();
    }
  }
  
  /**
   * Handle data connection closed
   * This is called when the WebRTC data connection to the opponent closes.
   */
  private handleConnectionClosed(): void {
    this.stopHeartbeat();
    this.connection = null;
    
    // For data connection loss, we need different handling than signaling server disconnection
    if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.updateState({ status: ConnectionStatus.RECONNECTING });
      this.attemptDataReconnect();
    } else {
      this.updateState({
        status: ConnectionStatus.DISCONNECTED,
        opponentId: null,
      });
      this.onDisconnected?.('Connection closed');
    }
  }
  
  /**
   * Attempt to reconnect to the signaling server with exponential backoff
   * This is only for when we lose connection to the PeerJS server itself.
   */
  private attemptSignalingReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Check if peer is actually disconnected from signaling server
    if (this.peer && !this.peer.disconnected) {
      console.log('Peer is still connected to signaling server, skipping reconnect');
      this.reconnectAttempts = 0;
      return;
    }
    
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );
    
    this.reconnectAttempts++;
    console.log(`Attempting signaling reconnect ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      try {
        // Only call reconnect() if peer is actually disconnected from signaling server
        if (this.peer && this.peer.disconnected) {
          this.peer.reconnect();
        } else {
          console.log('Peer not disconnected, skipping reconnect call');
          this.reconnectAttempts = 0;
        }
      } catch (error) {
        console.error('Signaling reconnect attempt failed:', error);
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.attemptSignalingReconnect();
        } else {
          this.updateState({ status: ConnectionStatus.DISCONNECTED });
          this.onDisconnected?.('Max reconnection attempts reached');
        }
      }
    }, delay);
  }
  
  /**
   * Attempt to reconnect the data connection with exponential backoff
   * This is for when the WebRTC data connection to the opponent is lost.
   */
  private attemptDataReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );
    
    this.reconnectAttempts++;
    console.log(`Attempting data reconnect ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      try {
        if (this.isHost) {
          // Host should NOT call peer.reconnect() - they wait for incoming connections
          // The host's peer is still connected to signaling server, just the data connection was lost
          // We just wait for the guest to reconnect to us
          console.log('Host waiting for guest to reconnect...');
          // Reset attempts since we're just waiting
          this.reconnectAttempts = 0;
          // Keep the reconnecting state but don't actively try to reconnect
          // The guest will initiate a new connection
        } else {
          // Guest needs to create a new data connection to host
          if (this.peer && this.lastKnownPeerId && !this.peer.disconnected) {
            console.log('Guest attempting to reconnect to host:', this.lastKnownPeerId);
            this.connection = this.peer.connect(this.lastKnownPeerId, {
              reliable: true,
            });
            
            this.setupConnectionListeners(this.connection, () => {
              this.reconnectAttempts = 0;
              this.updateState({
                status: ConnectionStatus.CONNECTED,
                opponentId: this.lastKnownPeerId,
              });
              this.startHeartbeat();
              this.onConnected?.(this.lastKnownPeerId);
            });
          } else if (this.peer?.disconnected) {
            // If peer is disconnected from signaling server, reconnect to it first
            console.log('Guest peer disconnected from signaling, reconnecting...');
            this.attemptSignalingReconnect();
          }
        }
      } catch (error) {
        console.error('Data reconnect attempt failed:', error);
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.attemptDataReconnect();
        } else {
          this.updateState({ status: ConnectionStatus.DISCONNECTED });
          this.onDisconnected?.('Max reconnection attempts reached');
        }
      }
    }, delay);
  }
  
  /**
   * Legacy method for backward compatibility
   * @deprecated Use attemptDataReconnect or attemptSignalingReconnect instead
   */
  private attemptReconnect(): void {
    // Determine which type of reconnection is needed
    if (this.peer?.disconnected) {
      this.attemptSignalingReconnect();
    } else {
      this.attemptDataReconnect();
    }
  }
  
  /**
   * Enable automatic reconnection
   */
  enableReconnect(): void {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
  }
  
  /**
   * Disable automatic reconnection
   */
  disableReconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  // ============================================
  // Private Methods - Error Handling
  // ============================================
  
  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('PeerConnection error:', error);
    
    this.updateState({ status: ConnectionStatus.ERROR });
    this.onError?.(error);
    
    // Attempt reconnect on certain errors
    if (this.shouldReconnect && error.message.includes('Lost connection')) {
      this.handleConnectionClosed();
    }
  }
  
  // ============================================
  // Private Methods - State Management
  // ============================================
  
  /**
   * Update connection state and notify listeners
   */
  private updateState(updates: Partial<ConnectionState>): void {
    this.connectionState = {
      ...this.connectionState,
      ...updates,
    };
    this.onStateChange?.(this.getConnectionState());
  }
  
  /**
   * Clean up all resources
   */
  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.roomId = '';
    this.peerId = '';
    this.reconnectAttempts = 0;
  }
}