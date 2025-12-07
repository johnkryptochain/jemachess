/**
 * Network Module
 * 
 * This module provides WebRTC peer-to-peer networking functionality
 * for the chess game, including:
 * - PeerJS integration for WebRTC connections
 * - Room creation and joining
 * - Message protocol for game communication
 * - Game state synchronization between peers
 */

// ============================================
// Core Classes
// ============================================

export { PeerConnection } from './peer-connection';
export type { PeerConfig } from './peer-connection';

export { RoomManager } from './room-manager';

export { GameSync } from './game-sync';
export type { NetworkMove, GameSyncConfig } from './game-sync';

// ============================================
// Message Protocol
// ============================================

export {
  // Enum
  MessageType,
  
  // Message factory functions
  createHelloMessage,
  createReadyMessage,
  createGameStartMessage,
  createGameEndMessage,
  createResignMessage,
  createDrawOfferMessage,
  createDrawAcceptMessage,
  createDrawDeclineMessage,
  createMoveMessage,
  createMoveAckMessage,
  createMoveRejectMessage,
  createStateRequestMessage,
  createStateResponseMessage,
  createChatMessage,
  createPingMessage,
  createPongMessage,
  
  // Serialization utilities
  serializeMessage,
  deserializeMessage,
  isValidMessage,
  getMessageType,
} from './messages';

// ============================================
// Message Types
// ============================================

export type {
  // Base message
  BaseMessage,
  GameMessage,
  
  // Connection messages
  HelloMessage,
  ReadyMessage,
  
  // Game control messages
  GameStartMessage,
  GameEndMessage,
  ResignMessage,
  DrawOfferMessage,
  DrawAcceptMessage,
  DrawDeclineMessage,
  
  // Move messages
  MoveMessage,
  MoveAckMessage,
  MoveRejectMessage,
  
  // State sync messages
  StateRequestMessage,
  StateResponseMessage,
  
  // Chat messages
  ChatMessage,
  
  // Heartbeat messages
  PingMessage,
  PongMessage,
} from './messages';