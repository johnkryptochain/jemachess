/**
 * Message Protocol for P2P Communication
 * 
 * Defines all message types and interfaces for WebRTC peer-to-peer
 * communication in the chess game.
 */

import type { Move, GameState, PieceColor, GameStatus, PieceType } from '../types';

// ============================================
// Message Types Enum
// ============================================

/**
 * All possible message types for P2P communication
 */
export enum MessageType {
  // Connection messages
  HELLO = 'hello',
  READY = 'ready',
  
  // Game control messages
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  RESIGN = 'resign',
  DRAW_OFFER = 'draw_offer',
  DRAW_ACCEPT = 'draw_accept',
  DRAW_DECLINE = 'draw_decline',
  
  // Move messages
  MOVE = 'move',
  MOVE_ACK = 'move_ack',
  MOVE_REJECT = 'move_reject',
  
  // State synchronization messages
  STATE_REQUEST = 'state_request',
  STATE_RESPONSE = 'state_response',
  
  // Chat messages (optional feature)
  CHAT = 'chat',
  
  // Heartbeat messages
  PING = 'ping',
  PONG = 'pong',
}

// ============================================
// Base Message Interface
// ============================================

/**
 * Base interface for all game messages
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  senderId: string;
}

// ============================================
// Connection Messages
// ============================================

/**
 * Initial handshake message sent when connecting
 */
export interface HelloMessage extends BaseMessage {
  type: MessageType.HELLO;
  playerName: string;
  clientVersion: string;
}

/**
 * Message indicating player is ready to start
 */
export interface ReadyMessage extends BaseMessage {
  type: MessageType.READY;
  playerColor: PieceColor;
}

// ============================================
// Game Control Messages
// ============================================

/**
 * Message to start the game
 */
export interface GameStartMessage extends BaseMessage {
  type: MessageType.GAME_START;
  hostColor: PieceColor;
  guestColor: PieceColor;
  initialFen: string;
  timeControl: {
    initial: number;
    increment: number;
  };
}

/**
 * Message indicating game has ended
 */
export interface GameEndMessage extends BaseMessage {
  type: MessageType.GAME_END;
  status: GameStatus;
  winner: PieceColor | null;
  reason: string;
}

/**
 * Message to resign from the game
 */
export interface ResignMessage extends BaseMessage {
  type: MessageType.RESIGN;
  resigningColor: PieceColor;
}

/**
 * Message to offer a draw
 */
export interface DrawOfferMessage extends BaseMessage {
  type: MessageType.DRAW_OFFER;
  offeringColor: PieceColor;
}

/**
 * Message to accept a draw offer
 */
export interface DrawAcceptMessage extends BaseMessage {
  type: MessageType.DRAW_ACCEPT;
}

/**
 * Message to decline a draw offer
 */
export interface DrawDeclineMessage extends BaseMessage {
  type: MessageType.DRAW_DECLINE;
}

// ============================================
// Move Messages
// ============================================

/**
 * Message containing a chess move
 */
export interface MoveMessage extends BaseMessage {
  type: MessageType.MOVE;
  move: {
    from: { file: number; rank: number };
    to: { file: number; rank: number };
    promotion?: PieceType;
  };
  moveNumber: number;
  fen: string; // FEN after the move for verification
}

/**
 * Message acknowledging a received move
 */
export interface MoveAckMessage extends BaseMessage {
  type: MessageType.MOVE_ACK;
  moveNumber: number;
  fen: string; // Confirming FEN matches
}

/**
 * Message rejecting an invalid move
 */
export interface MoveRejectMessage extends BaseMessage {
  type: MessageType.MOVE_REJECT;
  moveNumber: number;
  reason: string;
  expectedFen: string;
}

// ============================================
// State Synchronization Messages
// ============================================

/**
 * Request for full game state (used for reconnection)
 */
export interface StateRequestMessage extends BaseMessage {
  type: MessageType.STATE_REQUEST;
  lastKnownMoveNumber: number;
}

/**
 * Response with full game state
 */
export interface StateResponseMessage extends BaseMessage {
  type: MessageType.STATE_RESPONSE;
  fen: string;
  moveHistory: Array<{
    from: { file: number; rank: number };
    to: { file: number; rank: number };
    promotion?: PieceType;
  }>;
  currentMoveNumber: number;
  whiteTime: number;
  blackTime: number;
  status: GameStatus;
}

// ============================================
// Chat Messages
// ============================================

/**
 * Chat message between players
 */
export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT;
  content: string;
}

// ============================================
// Heartbeat Messages
// ============================================

/**
 * Ping message for connection health check
 */
export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
  sequence: number;
}

/**
 * Pong response to ping
 */
export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
  sequence: number;
  receivedTimestamp: number;
}

// ============================================
// Union Type for All Messages
// ============================================

/**
 * Union type of all possible game messages
 */
export type GameMessage =
  | HelloMessage
  | ReadyMessage
  | GameStartMessage
  | GameEndMessage
  | ResignMessage
  | DrawOfferMessage
  | DrawAcceptMessage
  | DrawDeclineMessage
  | MoveMessage
  | MoveAckMessage
  | MoveRejectMessage
  | StateRequestMessage
  | StateResponseMessage
  | ChatMessage
  | PingMessage
  | PongMessage;

// ============================================
// Message Factory Functions
// ============================================

/**
 * Create a base message with common fields
 */
function createBaseMessage(type: MessageType, senderId: string): BaseMessage {
  return {
    type,
    timestamp: Date.now(),
    senderId,
  };
}

/**
 * Create a HELLO message
 */
export function createHelloMessage(
  senderId: string,
  playerName: string,
  clientVersion: string = '1.0.0'
): HelloMessage {
  return {
    ...createBaseMessage(MessageType.HELLO, senderId),
    type: MessageType.HELLO,
    playerName,
    clientVersion,
  };
}

/**
 * Create a READY message
 */
export function createReadyMessage(
  senderId: string,
  playerColor: PieceColor
): ReadyMessage {
  return {
    ...createBaseMessage(MessageType.READY, senderId),
    type: MessageType.READY,
    playerColor,
  };
}

/**
 * Create a GAME_START message
 */
export function createGameStartMessage(
  senderId: string,
  hostColor: PieceColor,
  guestColor: PieceColor,
  initialFen: string,
  timeControl: { initial: number; increment: number }
): GameStartMessage {
  return {
    ...createBaseMessage(MessageType.GAME_START, senderId),
    type: MessageType.GAME_START,
    hostColor,
    guestColor,
    initialFen,
    timeControl,
  };
}

/**
 * Create a GAME_END message
 */
export function createGameEndMessage(
  senderId: string,
  status: GameStatus,
  winner: PieceColor | null,
  reason: string
): GameEndMessage {
  return {
    ...createBaseMessage(MessageType.GAME_END, senderId),
    type: MessageType.GAME_END,
    status,
    winner,
    reason,
  };
}

/**
 * Create a RESIGN message
 */
export function createResignMessage(
  senderId: string,
  resigningColor: PieceColor
): ResignMessage {
  return {
    ...createBaseMessage(MessageType.RESIGN, senderId),
    type: MessageType.RESIGN,
    resigningColor,
  };
}

/**
 * Create a DRAW_OFFER message
 */
export function createDrawOfferMessage(
  senderId: string,
  offeringColor: PieceColor
): DrawOfferMessage {
  return {
    ...createBaseMessage(MessageType.DRAW_OFFER, senderId),
    type: MessageType.DRAW_OFFER,
    offeringColor,
  };
}

/**
 * Create a DRAW_ACCEPT message
 */
export function createDrawAcceptMessage(senderId: string): DrawAcceptMessage {
  return {
    ...createBaseMessage(MessageType.DRAW_ACCEPT, senderId),
    type: MessageType.DRAW_ACCEPT,
  };
}

/**
 * Create a DRAW_DECLINE message
 */
export function createDrawDeclineMessage(senderId: string): DrawDeclineMessage {
  return {
    ...createBaseMessage(MessageType.DRAW_DECLINE, senderId),
    type: MessageType.DRAW_DECLINE,
  };
}

/**
 * Create a MOVE message
 */
export function createMoveMessage(
  senderId: string,
  move: { from: { file: number; rank: number }; to: { file: number; rank: number }; promotion?: PieceType },
  moveNumber: number,
  fen: string
): MoveMessage {
  return {
    ...createBaseMessage(MessageType.MOVE, senderId),
    type: MessageType.MOVE,
    move,
    moveNumber,
    fen,
  };
}

/**
 * Create a MOVE_ACK message
 */
export function createMoveAckMessage(
  senderId: string,
  moveNumber: number,
  fen: string
): MoveAckMessage {
  return {
    ...createBaseMessage(MessageType.MOVE_ACK, senderId),
    type: MessageType.MOVE_ACK,
    moveNumber,
    fen,
  };
}

/**
 * Create a MOVE_REJECT message
 */
export function createMoveRejectMessage(
  senderId: string,
  moveNumber: number,
  reason: string,
  expectedFen: string
): MoveRejectMessage {
  return {
    ...createBaseMessage(MessageType.MOVE_REJECT, senderId),
    type: MessageType.MOVE_REJECT,
    moveNumber,
    reason,
    expectedFen,
  };
}

/**
 * Create a STATE_REQUEST message
 */
export function createStateRequestMessage(
  senderId: string,
  lastKnownMoveNumber: number
): StateRequestMessage {
  return {
    ...createBaseMessage(MessageType.STATE_REQUEST, senderId),
    type: MessageType.STATE_REQUEST,
    lastKnownMoveNumber,
  };
}

/**
 * Create a STATE_RESPONSE message
 */
export function createStateResponseMessage(
  senderId: string,
  fen: string,
  moveHistory: Array<{ from: { file: number; rank: number }; to: { file: number; rank: number }; promotion?: PieceType }>,
  currentMoveNumber: number,
  whiteTime: number,
  blackTime: number,
  status: GameStatus
): StateResponseMessage {
  return {
    ...createBaseMessage(MessageType.STATE_RESPONSE, senderId),
    type: MessageType.STATE_RESPONSE,
    fen,
    moveHistory,
    currentMoveNumber,
    whiteTime,
    blackTime,
    status,
  };
}

/**
 * Create a CHAT message
 */
export function createChatMessage(
  senderId: string,
  content: string
): ChatMessage {
  return {
    ...createBaseMessage(MessageType.CHAT, senderId),
    type: MessageType.CHAT,
    content,
  };
}

/**
 * Create a PING message
 */
export function createPingMessage(
  senderId: string,
  sequence: number
): PingMessage {
  return {
    ...createBaseMessage(MessageType.PING, senderId),
    type: MessageType.PING,
    sequence,
  };
}

/**
 * Create a PONG message
 */
export function createPongMessage(
  senderId: string,
  sequence: number,
  receivedTimestamp: number
): PongMessage {
  return {
    ...createBaseMessage(MessageType.PONG, senderId),
    type: MessageType.PONG,
    sequence,
    receivedTimestamp,
  };
}

// ============================================
// Message Serialization
// ============================================

/**
 * Serialize a message to JSON string
 */
export function serializeMessage(message: GameMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to a message
 */
export function deserializeMessage(data: string): GameMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (isValidMessage(parsed)) {
      return parsed as GameMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Type guard to check if an object is a valid message
 */
export function isValidMessage(obj: unknown): obj is GameMessage {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const message = obj as Record<string, unknown>;
  
  // Check required base fields
  if (typeof message.type !== 'string') return false;
  if (typeof message.timestamp !== 'number') return false;
  if (typeof message.senderId !== 'string') return false;
  
  // Check if type is a valid MessageType
  const validTypes = Object.values(MessageType);
  if (!validTypes.includes(message.type as MessageType)) {
    return false;
  }
  
  return true;
}

/**
 * Get message type from a message
 */
export function getMessageType(message: GameMessage): MessageType {
  return message.type;
}