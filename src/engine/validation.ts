/**
 * Move Validation Module
 * 
 * Contains functions to validate moves and check game state conditions
 * like check, checkmate, stalemate, and various draw conditions.
 */

import {
  Piece,
  PieceType,
  PieceColor,
  Position,
  Move,
  MoveType,
  GameState,
  GameStatus,
  CastlingRights,
} from '../types';
import { ChessBoard } from './board';
import {
  getAllLegalMoves,
  getLegalMovesForPosition,
  isSquareAttackedBy,
} from './moves';

/**
 * Validates if a move is legal in the current game state
 */
export function isValidMove(
  board: ChessBoard,
  move: Move,
  gameState: {
    currentTurn: PieceColor;
    enPassantSquare: Position | null;
    castlingRights: CastlingRights;
  }
): boolean {
  // Check if it's the correct player's turn
  if (move.piece.color !== gameState.currentTurn) {
    return false;
  }

  // Get the piece at the from position
  const piece = board.getPiece(move.from);
  if (!piece) {
    return false;
  }

  // Check if the piece matches
  if (piece.type !== move.piece.type || piece.color !== move.piece.color) {
    return false;
  }

  // Get all legal moves for this position
  const legalMoves = getLegalMovesForPosition(
    board,
    move.from,
    gameState.enPassantSquare,
    gameState.castlingRights
  );

  // Check if the move is in the list of legal moves
  return legalMoves.some(
    (legalMove) =>
      legalMove.to.file === move.to.file &&
      legalMove.to.rank === move.to.rank &&
      legalMove.moveType === move.moveType &&
      (move.moveType !== MoveType.PROMOTION || legalMove.promotion === move.promotion)
  );
}

/**
 * Checks if the king of the given color is in check
 */
export function isInCheck(board: ChessBoard, color: PieceColor): boolean {
  const kingPos = board.findKing(color);
  if (!kingPos) {
    return false; // No king found (shouldn't happen in a valid game)
  }

  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  return isSquareAttackedBy(board, kingPos, enemyColor);
}

/**
 * Checks if the given color is in checkmate
 */
export function isCheckmate(
  board: ChessBoard,
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  }
): boolean {
  // Must be in check to be checkmate
  if (!isInCheck(board, color)) {
    return false;
  }

  // If there are any legal moves, it's not checkmate
  const legalMoves = getAllLegalMoves(board, color, enPassantTarget, castlingRights);
  return legalMoves.length === 0;
}

/**
 * Checks if the given color is in stalemate
 */
export function isStalemate(
  board: ChessBoard,
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  }
): boolean {
  // Must NOT be in check to be stalemate
  if (isInCheck(board, color)) {
    return false;
  }

  // If there are no legal moves, it's stalemate
  const legalMoves = getAllLegalMoves(board, color, enPassantTarget, castlingRights);
  return legalMoves.length === 0;
}

/**
 * Checks if a move would leave the king in check
 */
export function wouldBeInCheck(
  board: ChessBoard,
  move: Move,
  color: PieceColor
): boolean {
  // Make the move on a cloned board
  const testBoard = board.clone();
  
  // Handle en passant capture
  if (move.moveType === MoveType.EN_PASSANT) {
    const capturedPawnPos: Position = {
      file: move.to.file,
      rank: move.from.rank,
    };
    testBoard.setPiece(capturedPawnPos, null);
  }
  
  // Handle castling - move the rook too
  if (move.moveType === MoveType.CASTLING_KINGSIDE) {
    const rookFrom: Position = { file: 7, rank: move.from.rank };
    const rookTo: Position = { file: 5, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  } else if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
    const rookFrom: Position = { file: 0, rank: move.from.rank };
    const rookTo: Position = { file: 3, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  }
  
  // Make the main move
  testBoard.movePiece(move.from, move.to);
  
  // Handle promotion
  if (move.moveType === MoveType.PROMOTION && move.promotion) {
    testBoard.setPiece(move.to, { type: move.promotion, color });
  }

  // Check if king is in check after the move
  return isInCheck(testBoard, color);
}

/**
 * Checks for draw conditions
 */
export function isDraw(gameState: GameState): {
  isDraw: boolean;
  reason?: 'fifty_moves' | 'threefold_repetition' | 'insufficient_material' | 'stalemate';
} {
  // Check 50-move rule
  if (gameState.halfMoveClock >= 100) {
    return { isDraw: true, reason: 'fifty_moves' };
  }

  // Check threefold repetition
  if (isThreefoldRepetition(gameState.positionHistory)) {
    return { isDraw: true, reason: 'threefold_repetition' };
  }

  // Check insufficient material
  const board = new ChessBoard();
  board.fromFEN(gameState.positionHistory[gameState.positionHistory.length - 1]?.split(' ')[0] || '');
  if (hasInsufficientMaterial(board)) {
    return { isDraw: true, reason: 'insufficient_material' };
  }

  return { isDraw: false };
}

/**
 * Checks for threefold repetition
 */
export function isThreefoldRepetition(positionHistory: string[]): boolean {
  if (positionHistory.length < 5) {
    return false;
  }

  // Count occurrences of each position
  // We only compare the board position part of FEN (first part before space)
  const positionCounts = new Map<string, number>();

  for (const fen of positionHistory) {
    // Extract just the board position and relevant state (not move counters)
    const parts = fen.split(' ');
    const positionKey = parts.slice(0, 4).join(' '); // board, turn, castling, en passant
    
    const count = (positionCounts.get(positionKey) || 0) + 1;
    positionCounts.set(positionKey, count);

    if (count >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if there is insufficient material to checkmate
 */
export function hasInsufficientMaterial(board: ChessBoard): boolean {
  const whitePieces = board.getPiecesByColor(PieceColor.WHITE);
  const blackPieces = board.getPiecesByColor(PieceColor.BLACK);

  // Get piece counts (excluding kings)
  const whiteNonKing = whitePieces.filter((p) => p.piece.type !== PieceType.KING);
  const blackNonKing = blackPieces.filter((p) => p.piece.type !== PieceType.KING);

  // King vs King
  if (whiteNonKing.length === 0 && blackNonKing.length === 0) {
    return true;
  }

  // King + minor piece vs King
  if (whiteNonKing.length === 0 && blackNonKing.length === 1) {
    const piece = blackNonKing[0].piece;
    if (piece.type === PieceType.BISHOP || piece.type === PieceType.KNIGHT) {
      return true;
    }
  }

  if (blackNonKing.length === 0 && whiteNonKing.length === 1) {
    const piece = whiteNonKing[0].piece;
    if (piece.type === PieceType.BISHOP || piece.type === PieceType.KNIGHT) {
      return true;
    }
  }

  // King + Bishop vs King + Bishop (same color bishops)
  if (whiteNonKing.length === 1 && blackNonKing.length === 1) {
    const whitePiece = whiteNonKing[0];
    const blackPiece = blackNonKing[0];

    if (
      whitePiece.piece.type === PieceType.BISHOP &&
      blackPiece.piece.type === PieceType.BISHOP
    ) {
      // Check if bishops are on same color squares
      const whiteSquareColor =
        (whitePiece.position.file + whitePiece.position.rank) % 2;
      const blackSquareColor =
        (blackPiece.position.file + blackPiece.position.rank) % 2;

      if (whiteSquareColor === blackSquareColor) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines the game status based on the current state
 */
export function getGameStatus(
  board: ChessBoard,
  currentTurn: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights,
  positionHistory: string[],
  halfMoveClock: number
): GameStatus {
  // Check for checkmate
  if (isCheckmate(board, currentTurn, enPassantTarget, castlingRights)) {
    return currentTurn === PieceColor.WHITE
      ? GameStatus.BLACK_WINS_CHECKMATE
      : GameStatus.WHITE_WINS_CHECKMATE;
  }

  // Check for stalemate
  if (isStalemate(board, currentTurn, enPassantTarget, castlingRights)) {
    return GameStatus.DRAW_STALEMATE;
  }

  // Check for 50-move rule
  if (halfMoveClock >= 100) {
    return GameStatus.DRAW_FIFTY_MOVES;
  }

  // Check for threefold repetition
  if (isThreefoldRepetition(positionHistory)) {
    return GameStatus.DRAW_THREEFOLD_REPETITION;
  }

  // Check for insufficient material
  if (hasInsufficientMaterial(board)) {
    return GameStatus.DRAW_INSUFFICIENT_MATERIAL;
  }

  return GameStatus.IN_PROGRESS;
}

/**
 * Validates castling rights after a move
 */
export function updateCastlingRights(
  currentRights: CastlingRights,
  move: Move
): CastlingRights {
  const newRights = { ...currentRights };

  // If king moves, lose all castling rights for that color
  if (move.piece.type === PieceType.KING) {
    if (move.piece.color === PieceColor.WHITE) {
      newRights.whiteKingside = false;
      newRights.whiteQueenside = false;
    } else {
      newRights.blackKingside = false;
      newRights.blackQueenside = false;
    }
  }

  // If rook moves from its starting position, lose that castling right
  if (move.piece.type === PieceType.ROOK) {
    if (move.piece.color === PieceColor.WHITE) {
      if (move.from.file === 0 && move.from.rank === 0) {
        newRights.whiteQueenside = false;
      } else if (move.from.file === 7 && move.from.rank === 0) {
        newRights.whiteKingside = false;
      }
    } else {
      if (move.from.file === 0 && move.from.rank === 7) {
        newRights.blackQueenside = false;
      } else if (move.from.file === 7 && move.from.rank === 7) {
        newRights.blackKingside = false;
      }
    }
  }

  // If a rook is captured, lose that castling right
  if (move.captured && move.captured.type === PieceType.ROOK) {
    if (move.to.file === 0 && move.to.rank === 0) {
      newRights.whiteQueenside = false;
    } else if (move.to.file === 7 && move.to.rank === 0) {
      newRights.whiteKingside = false;
    } else if (move.to.file === 0 && move.to.rank === 7) {
      newRights.blackQueenside = false;
    } else if (move.to.file === 7 && move.to.rank === 7) {
      newRights.blackKingside = false;
    }
  }

  return newRights;
}

/**
 * Determines the en passant target square after a move
 */
export function getEnPassantTarget(move: Move): Position | null {
  // En passant is only possible after a double pawn push
  if (move.piece.type !== PieceType.PAWN) {
    return null;
  }

  const rankDiff = Math.abs(move.to.rank - move.from.rank);
  if (rankDiff !== 2) {
    return null;
  }

  // The en passant target is the square the pawn passed over
  return {
    file: move.from.file,
    rank: (move.from.rank + move.to.rank) / 2,
  };
}

/**
 * Checks if a move gives check to the opponent
 */
export function givesCheck(board: ChessBoard, move: Move): boolean {
  // Make the move on a cloned board
  const testBoard = board.clone();
  
  // Handle en passant capture
  if (move.moveType === MoveType.EN_PASSANT) {
    const capturedPawnPos: Position = {
      file: move.to.file,
      rank: move.from.rank,
    };
    testBoard.setPiece(capturedPawnPos, null);
  }
  
  // Handle castling - move the rook too
  if (move.moveType === MoveType.CASTLING_KINGSIDE) {
    const rookFrom: Position = { file: 7, rank: move.from.rank };
    const rookTo: Position = { file: 5, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  } else if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
    const rookFrom: Position = { file: 0, rank: move.from.rank };
    const rookTo: Position = { file: 3, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  }
  
  // Make the main move
  testBoard.movePiece(move.from, move.to);
  
  // Handle promotion
  if (move.moveType === MoveType.PROMOTION && move.promotion) {
    testBoard.setPiece(move.to, { type: move.promotion, color: move.piece.color });
  }

  // Check if opponent's king is in check
  const enemyColor =
    move.piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  return isInCheck(testBoard, enemyColor);
}

/**
 * Checks if a move gives checkmate to the opponent
 */
export function givesCheckmate(
  board: ChessBoard,
  move: Move,
  castlingRights: CastlingRights
): boolean {
  // Make the move on a cloned board
  const testBoard = board.clone();
  
  // Handle en passant capture
  if (move.moveType === MoveType.EN_PASSANT) {
    const capturedPawnPos: Position = {
      file: move.to.file,
      rank: move.from.rank,
    };
    testBoard.setPiece(capturedPawnPos, null);
  }
  
  // Handle castling - move the rook too
  if (move.moveType === MoveType.CASTLING_KINGSIDE) {
    const rookFrom: Position = { file: 7, rank: move.from.rank };
    const rookTo: Position = { file: 5, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  } else if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
    const rookFrom: Position = { file: 0, rank: move.from.rank };
    const rookTo: Position = { file: 3, rank: move.from.rank };
    testBoard.movePiece(rookFrom, rookTo);
  }
  
  // Make the main move
  testBoard.movePiece(move.from, move.to);
  
  // Handle promotion
  if (move.moveType === MoveType.PROMOTION && move.promotion) {
    testBoard.setPiece(move.to, { type: move.promotion, color: move.piece.color });
  }

  // Update castling rights
  const newCastlingRights = updateCastlingRights(castlingRights, move);

  // Get en passant target
  const enPassantTarget = getEnPassantTarget(move);

  // Check if opponent is in checkmate
  const enemyColor =
    move.piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  return isCheckmate(testBoard, enemyColor, enPassantTarget, newCastlingRights);
}