/**
 * Move Generation Module
 * 
 * Contains functions to generate all possible moves for each piece type,
 * including special moves like castling, en passant, and pawn promotion.
 */

import {
  Piece,
  PieceType,
  PieceColor,
  Position,
  Move,
  MoveType,
  CastlingRights,
} from '../types';
import { ChessBoard } from './board';

/**
 * Direction vectors for piece movement
 */
const DIRECTIONS = {
  // Rook directions (orthogonal)
  ROOK: [
    { file: 0, rank: 1 },   // up
    { file: 0, rank: -1 },  // down
    { file: 1, rank: 0 },   // right
    { file: -1, rank: 0 },  // left
  ],
  // Bishop directions (diagonal)
  BISHOP: [
    { file: 1, rank: 1 },   // up-right
    { file: 1, rank: -1 },  // down-right
    { file: -1, rank: 1 },  // up-left
    { file: -1, rank: -1 }, // down-left
  ],
  // Knight moves (L-shape)
  KNIGHT: [
    { file: 1, rank: 2 },
    { file: 2, rank: 1 },
    { file: 2, rank: -1 },
    { file: 1, rank: -2 },
    { file: -1, rank: -2 },
    { file: -2, rank: -1 },
    { file: -2, rank: 1 },
    { file: -1, rank: 2 },
  ],
  // King moves (all 8 directions, 1 square)
  KING: [
    { file: 0, rank: 1 },
    { file: 1, rank: 1 },
    { file: 1, rank: 0 },
    { file: 1, rank: -1 },
    { file: 0, rank: -1 },
    { file: -1, rank: -1 },
    { file: -1, rank: 0 },
    { file: -1, rank: 1 },
  ],
};

/**
 * Creates a basic move object
 */
function createMove(
  from: Position,
  to: Position,
  piece: Piece,
  moveType: MoveType = MoveType.NORMAL,
  captured?: Piece,
  promotion?: PieceType
): Move {
  return {
    from,
    to,
    piece,
    moveType,
    captured,
    promotion,
    isCheck: false,      // Will be set by validation
    isCheckmate: false,  // Will be set by validation
  };
}

/**
 * Generates sliding piece moves (rook, bishop, queen)
 */
function getSlidingMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor,
  directions: { file: number; rank: number }[],
  piece: Piece
): Move[] {
  const moves: Move[] = [];

  for (const dir of directions) {
    let currentPos: Position = {
      file: position.file + dir.file,
      rank: position.rank + dir.rank,
    };

    while (board.isValidPosition(currentPos)) {
      if (board.isEmpty(currentPos)) {
        moves.push(createMove(position, { ...currentPos }, piece));
      } else if (board.isEnemy(currentPos, color)) {
        const captured = board.getPiece(currentPos)!;
        moves.push(createMove(position, { ...currentPos }, piece, MoveType.CAPTURE, captured));
        break; // Can't move past an enemy piece
      } else {
        break; // Can't move past a friendly piece
      }

      currentPos = {
        file: currentPos.file + dir.file,
        rank: currentPos.rank + dir.rank,
      };
    }
  }

  return moves;
}

/**
 * Generates pawn moves including captures, double push, en passant, and promotion
 */
export function getPawnMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor,
  enPassantTarget: Position | null = null
): Move[] {
  const moves: Move[] = [];
  const piece: Piece = { type: PieceType.PAWN, color };
  const direction = color === PieceColor.WHITE ? 1 : -1;
  const startRank = color === PieceColor.WHITE ? 1 : 6;
  const promotionRank = color === PieceColor.WHITE ? 7 : 0;

  // Single push
  const singlePush: Position = {
    file: position.file,
    rank: position.rank + direction,
  };

  if (board.isValidPosition(singlePush) && board.isEmpty(singlePush)) {
    if (singlePush.rank === promotionRank) {
      // Promotion moves
      const promotionPieces = [PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT];
      for (const promoteTo of promotionPieces) {
        moves.push(createMove(position, singlePush, piece, MoveType.PROMOTION, undefined, promoteTo));
      }
    } else {
      moves.push(createMove(position, singlePush, piece));
    }

    // Double push (only if single push is possible)
    if (position.rank === startRank) {
      const doublePush: Position = {
        file: position.file,
        rank: position.rank + 2 * direction,
      };

      if (board.isEmpty(doublePush)) {
        moves.push(createMove(position, doublePush, piece));
      }
    }
  }

  // Captures (diagonal)
  const captureOffsets = [
    { file: -1, rank: direction },
    { file: 1, rank: direction },
  ];

  for (const offset of captureOffsets) {
    const capturePos: Position = {
      file: position.file + offset.file,
      rank: position.rank + offset.rank,
    };

    if (!board.isValidPosition(capturePos)) continue;

    // Regular capture
    if (board.isEnemy(capturePos, color)) {
      const captured = board.getPiece(capturePos)!;
      if (capturePos.rank === promotionRank) {
        // Capture with promotion
        const promotionPieces = [PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT];
        for (const promoteTo of promotionPieces) {
          moves.push(createMove(position, capturePos, piece, MoveType.PROMOTION, captured, promoteTo));
        }
      } else {
        moves.push(createMove(position, capturePos, piece, MoveType.CAPTURE, captured));
      }
    }

    // En passant
    if (
      enPassantTarget &&
      capturePos.file === enPassantTarget.file &&
      capturePos.rank === enPassantTarget.rank
    ) {
      const capturedPawnPos: Position = {
        file: enPassantTarget.file,
        rank: position.rank,
      };
      const capturedPawn = board.getPiece(capturedPawnPos);
      if (capturedPawn && capturedPawn.type === PieceType.PAWN && capturedPawn.color !== color) {
        moves.push(createMove(position, capturePos, piece, MoveType.EN_PASSANT, capturedPawn));
      }
    }
  }

  return moves;
}

/**
 * Generates rook moves
 */
export function getRookMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor
): Move[] {
  const piece: Piece = { type: PieceType.ROOK, color };
  return getSlidingMoves(board, position, color, DIRECTIONS.ROOK, piece);
}

/**
 * Generates knight moves
 */
export function getKnightMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor
): Move[] {
  const moves: Move[] = [];
  const piece: Piece = { type: PieceType.KNIGHT, color };

  for (const offset of DIRECTIONS.KNIGHT) {
    const targetPos: Position = {
      file: position.file + offset.file,
      rank: position.rank + offset.rank,
    };

    if (!board.isValidPosition(targetPos)) continue;

    if (board.isEmpty(targetPos)) {
      moves.push(createMove(position, targetPos, piece));
    } else if (board.isEnemy(targetPos, color)) {
      const captured = board.getPiece(targetPos)!;
      moves.push(createMove(position, targetPos, piece, MoveType.CAPTURE, captured));
    }
  }

  return moves;
}

/**
 * Generates bishop moves
 */
export function getBishopMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor
): Move[] {
  const piece: Piece = { type: PieceType.BISHOP, color };
  return getSlidingMoves(board, position, color, DIRECTIONS.BISHOP, piece);
}

/**
 * Generates queen moves (combination of rook and bishop)
 */
export function getQueenMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor
): Move[] {
  const piece: Piece = { type: PieceType.QUEEN, color };
  const allDirections = [...DIRECTIONS.ROOK, ...DIRECTIONS.BISHOP];
  return getSlidingMoves(board, position, color, allDirections, piece);
}

/**
 * Generates king moves including castling
 */
export function getKingMoves(
  board: ChessBoard,
  position: Position,
  color: PieceColor,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  },
  isSquareAttacked?: (pos: Position, byColor: PieceColor) => boolean
): Move[] {
  const moves: Move[] = [];
  const piece: Piece = { type: PieceType.KING, color };

  // Regular king moves
  for (const offset of DIRECTIONS.KING) {
    const targetPos: Position = {
      file: position.file + offset.file,
      rank: position.rank + offset.rank,
    };

    if (!board.isValidPosition(targetPos)) continue;

    if (board.isEmpty(targetPos)) {
      moves.push(createMove(position, targetPos, piece));
    } else if (board.isEnemy(targetPos, color)) {
      const captured = board.getPiece(targetPos)!;
      moves.push(createMove(position, targetPos, piece, MoveType.CAPTURE, captured));
    }
  }

  // Castling moves
  const castlingMoves = getCastlingMoves(board, position, color, castlingRights, isSquareAttacked);
  moves.push(...castlingMoves);

  return moves;
}

/**
 * Generates castling moves if available
 */
function getCastlingMoves(
  board: ChessBoard,
  kingPosition: Position,
  color: PieceColor,
  castlingRights: CastlingRights,
  isSquareAttacked?: (pos: Position, byColor: PieceColor) => boolean
): Move[] {
  const moves: Move[] = [];
  const piece: Piece = { type: PieceType.KING, color };
  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  const rank = color === PieceColor.WHITE ? 0 : 7;

  // Check if king is on its starting square
  if (kingPosition.file !== 4 || kingPosition.rank !== rank) {
    return moves;
  }

  // Check if king is in check (can't castle out of check)
  if (isSquareAttacked && isSquareAttacked(kingPosition, enemyColor)) {
    return moves;
  }

  // Kingside castling
  const canCastleKingside =
    color === PieceColor.WHITE ? castlingRights.whiteKingside : castlingRights.blackKingside;

  if (canCastleKingside) {
    const f1: Position = { file: 5, rank };
    const g1: Position = { file: 6, rank };
    const rookPos: Position = { file: 7, rank };

    // Check if squares between king and rook are empty
    if (board.isEmpty(f1) && board.isEmpty(g1)) {
      // Check if rook is in place
      const rook = board.getPiece(rookPos);
      if (rook && rook.type === PieceType.ROOK && rook.color === color) {
        // Check if king doesn't pass through or end in check
        const passesCheck =
          isSquareAttacked &&
          (isSquareAttacked(f1, enemyColor) || isSquareAttacked(g1, enemyColor));

        if (!passesCheck) {
          moves.push(createMove(kingPosition, g1, piece, MoveType.CASTLING_KINGSIDE));
        }
      }
    }
  }

  // Queenside castling
  const canCastleQueenside =
    color === PieceColor.WHITE ? castlingRights.whiteQueenside : castlingRights.blackQueenside;

  if (canCastleQueenside) {
    const d1: Position = { file: 3, rank };
    const c1: Position = { file: 2, rank };
    const b1: Position = { file: 1, rank };
    const rookPos: Position = { file: 0, rank };

    // Check if squares between king and rook are empty
    if (board.isEmpty(d1) && board.isEmpty(c1) && board.isEmpty(b1)) {
      // Check if rook is in place
      const rook = board.getPiece(rookPos);
      if (rook && rook.type === PieceType.ROOK && rook.color === color) {
        // Check if king doesn't pass through or end in check
        // Note: b1 doesn't need to be checked for attacks, only d1 and c1
        const passesCheck =
          isSquareAttacked &&
          (isSquareAttacked(d1, enemyColor) || isSquareAttacked(c1, enemyColor));

        if (!passesCheck) {
          moves.push(createMove(kingPosition, c1, piece, MoveType.CASTLING_QUEENSIDE));
        }
      }
    }
  }

  return moves;
}

/**
 * Gets all pseudo-legal moves for a piece at a given position
 * (doesn't check if the move leaves the king in check)
 */
export function getPieceMoves(
  board: ChessBoard,
  position: Position,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  },
  isSquareAttacked?: (pos: Position, byColor: PieceColor) => boolean
): Move[] {
  const piece = board.getPiece(position);
  if (!piece) return [];

  switch (piece.type) {
    case PieceType.PAWN:
      return getPawnMoves(board, position, piece.color, enPassantTarget);
    case PieceType.ROOK:
      return getRookMoves(board, position, piece.color);
    case PieceType.KNIGHT:
      return getKnightMoves(board, position, piece.color);
    case PieceType.BISHOP:
      return getBishopMoves(board, position, piece.color);
    case PieceType.QUEEN:
      return getQueenMoves(board, position, piece.color);
    case PieceType.KING:
      return getKingMoves(board, position, piece.color, castlingRights, isSquareAttacked);
    default:
      return [];
  }
}

/**
 * Gets all pseudo-legal moves for a color
 * (doesn't check if moves leave the king in check)
 */
export function getAllPseudoLegalMoves(
  board: ChessBoard,
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  },
  isSquareAttacked?: (pos: Position, byColor: PieceColor) => boolean
): Move[] {
  const moves: Move[] = [];
  const pieces = board.getPiecesByColor(color);

  for (const { position } of pieces) {
    const pieceMoves = getPieceMoves(
      board,
      position,
      enPassantTarget,
      castlingRights,
      isSquareAttacked
    );
    moves.push(...pieceMoves);
  }

  return moves;
}

/**
 * Checks if a square is attacked by any piece of the given color
 * This is a basic implementation that doesn't use the full move generation
 * to avoid circular dependencies
 */
export function isSquareAttackedBy(
  board: ChessBoard,
  position: Position,
  byColor: PieceColor
): boolean {
  // Check pawn attacks
  const pawnDirection = byColor === PieceColor.WHITE ? -1 : 1;
  const pawnAttacks = [
    { file: position.file - 1, rank: position.rank + pawnDirection },
    { file: position.file + 1, rank: position.rank + pawnDirection },
  ];

  for (const pos of pawnAttacks) {
    if (board.isValidPosition(pos)) {
      const piece = board.getPiece(pos);
      if (piece && piece.type === PieceType.PAWN && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check knight attacks
  for (const offset of DIRECTIONS.KNIGHT) {
    const pos: Position = {
      file: position.file + offset.file,
      rank: position.rank + offset.rank,
    };
    if (board.isValidPosition(pos)) {
      const piece = board.getPiece(pos);
      if (piece && piece.type === PieceType.KNIGHT && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check king attacks
  for (const offset of DIRECTIONS.KING) {
    const pos: Position = {
      file: position.file + offset.file,
      rank: position.rank + offset.rank,
    };
    if (board.isValidPosition(pos)) {
      const piece = board.getPiece(pos);
      if (piece && piece.type === PieceType.KING && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check sliding piece attacks (rook, bishop, queen)
  // Rook/Queen (orthogonal)
  for (const dir of DIRECTIONS.ROOK) {
    let pos: Position = {
      file: position.file + dir.file,
      rank: position.rank + dir.rank,
    };

    while (board.isValidPosition(pos)) {
      const piece = board.getPiece(pos);
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === PieceType.ROOK || piece.type === PieceType.QUEEN)
        ) {
          return true;
        }
        break; // Blocked by a piece
      }
      pos = {
        file: pos.file + dir.file,
        rank: pos.rank + dir.rank,
      };
    }
  }

  // Bishop/Queen (diagonal)
  for (const dir of DIRECTIONS.BISHOP) {
    let pos: Position = {
      file: position.file + dir.file,
      rank: position.rank + dir.rank,
    };

    while (board.isValidPosition(pos)) {
      const piece = board.getPiece(pos);
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN)
        ) {
          return true;
        }
        break; // Blocked by a piece
      }
      pos = {
        file: pos.file + dir.file,
        rank: pos.rank + dir.rank,
      };
    }
  }

  return false;
}

/**
 * Gets all legal moves for a color (filters out moves that leave king in check)
 */
export function getAllLegalMoves(
  board: ChessBoard,
  color: PieceColor,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  }
): Move[] {
  const isSquareAttacked = (pos: Position, byColor: PieceColor) =>
    isSquareAttackedBy(board, pos, byColor);

  const pseudoLegalMoves = getAllPseudoLegalMoves(
    board,
    color,
    enPassantTarget,
    castlingRights,
    isSquareAttacked
  );

  const legalMoves: Move[] = [];
  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

  for (const move of pseudoLegalMoves) {
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
    const kingPos = testBoard.findKing(color);
    if (kingPos && !isSquareAttackedBy(testBoard, kingPos, enemyColor)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

/**
 * Gets legal moves for a specific position
 */
export function getLegalMovesForPosition(
  board: ChessBoard,
  position: Position,
  enPassantTarget: Position | null = null,
  castlingRights: CastlingRights = {
    whiteKingside: false,
    whiteQueenside: false,
    blackKingside: false,
    blackQueenside: false,
  }
): Move[] {
  const piece = board.getPiece(position);
  if (!piece) return [];

  const allLegalMoves = getAllLegalMoves(board, piece.color, enPassantTarget, castlingRights);
  return allLegalMoves.filter(
    (move) => move.from.file === position.file && move.from.rank === position.rank
  );
}