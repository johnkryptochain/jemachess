/**
 * Chess Engine Module
 * 
 * This module contains:
 * - Board representation and manipulation
 * - Move generation and validation
 * - Game rules implementation
 * - Check/checkmate/stalemate detection
 */

// Board representation
export { ChessBoard } from './board';

// Game state management
export { ChessGame } from './game';

// Move generation functions
export {
  getPawnMoves,
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  getQueenMoves,
  getKingMoves,
  getPieceMoves,
  getAllPseudoLegalMoves,
  getAllLegalMoves,
  getLegalMovesForPosition,
  isSquareAttackedBy,
} from './moves';

// Validation functions
export {
  isValidMove,
  isInCheck,
  isCheckmate,
  isStalemate,
  isDraw,
  wouldBeInCheck,
  isThreefoldRepetition,
  hasInsufficientMaterial,
  getGameStatus,
  updateCastlingRights,
  getEnPassantTarget,
  givesCheck,
  givesCheckmate,
} from './validation';

// AI and evaluation
export { ChessAI, createAI } from './ai';
export type { AIDifficulty } from './ai';
export {
  evaluatePosition,
  getEvaluationDisplay,
  classifyMoveQuality,
  PIECE_VALUES,
} from './evaluation';
export type { MoveQuality } from './evaluation';