/**
 * Chess Position Evaluation Module
 * 
 * Provides position evaluation functions for the chess AI.
 * Uses material counting, piece-square tables, and positional factors.
 */

import { ChessBoard } from './board';
import { PieceType, PieceColor, Position, Piece } from '../types';

/**
 * Piece values in centipawns (1 pawn = 100)
 */
export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.PAWN]: 100,
  [PieceType.KNIGHT]: 320,
  [PieceType.BISHOP]: 330,
  [PieceType.ROOK]: 500,
  [PieceType.QUEEN]: 900,
  [PieceType.KING]: 20000,
};

/**
 * Piece-Square Tables for positional evaluation
 * Values are from White's perspective (flip for Black)
 * Higher values = better squares for that piece
 */

// Pawn position table - encourages central pawns and advancement
const PAWN_TABLE: number[][] = [
  [  0,   0,   0,   0,   0,   0,   0,   0],
  [ 50,  50,  50,  50,  50,  50,  50,  50],
  [ 10,  10,  20,  30,  30,  20,  10,  10],
  [  5,   5,  10,  25,  25,  10,   5,   5],
  [  0,   0,   0,  20,  20,   0,   0,   0],
  [  5,  -5, -10,   0,   0, -10,  -5,   5],
  [  5,  10,  10, -20, -20,  10,  10,   5],
  [  0,   0,   0,   0,   0,   0,   0,   0],
];

// Knight position table - encourages central knights
const KNIGHT_TABLE: number[][] = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20,   0,   0,   0,   0, -20, -40],
  [-30,   0,  10,  15,  15,  10,   0, -30],
  [-30,   5,  15,  20,  20,  15,   5, -30],
  [-30,   0,  15,  20,  20,  15,   0, -30],
  [-30,   5,  10,  15,  15,  10,   5, -30],
  [-40, -20,   0,   5,   5,   0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

// Bishop position table - encourages long diagonals
const BISHOP_TABLE: number[][] = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10,   0,   0,   0,   0,   0,   0, -10],
  [-10,   0,   5,  10,  10,   5,   0, -10],
  [-10,   5,   5,  10,  10,   5,   5, -10],
  [-10,   0,  10,  10,  10,  10,   0, -10],
  [-10,  10,  10,  10,  10,  10,  10, -10],
  [-10,   5,   0,   0,   0,   0,   5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

// Rook position table - encourages 7th rank and open files
const ROOK_TABLE: number[][] = [
  [  0,   0,   0,   0,   0,   0,   0,   0],
  [  5,  10,  10,  10,  10,  10,  10,   5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [  0,   0,   0,   5,   5,   0,   0,   0],
];

// Queen position table - encourages central activity
const QUEEN_TABLE: number[][] = [
  [-20, -10, -10,  -5,  -5, -10, -10, -20],
  [-10,   0,   0,   0,   0,   0,   0, -10],
  [-10,   0,   5,   5,   5,   5,   0, -10],
  [ -5,   0,   5,   5,   5,   5,   0,  -5],
  [  0,   0,   5,   5,   5,   5,   0,  -5],
  [-10,   5,   5,   5,   5,   5,   0, -10],
  [-10,   0,   5,   0,   0,   0,   0, -10],
  [-20, -10, -10,  -5,  -5, -10, -10, -20],
];

// King middle game table - encourages castled position
const KING_MIDDLE_TABLE: number[][] = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [ 20,  20,   0,   0,   0,   0,  20,  20],
  [ 20,  30,  10,   0,   0,  10,  30,  20],
];

// King endgame table - encourages central king
const KING_ENDGAME_TABLE: number[][] = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10,   0,   0, -10, -20, -30],
  [-30, -10,  20,  30,  30,  20, -10, -30],
  [-30, -10,  30,  40,  40,  30, -10, -30],
  [-30, -10,  30,  40,  40,  30, -10, -30],
  [-30, -10,  20,  30,  30,  20, -10, -30],
  [-30, -30,   0,   0,   0,   0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

/**
 * Get piece-square table value for a piece at a position
 */
function getPieceSquareValue(piece: Piece, position: Position, isEndgame: boolean): number {
  let table: number[][];
  
  switch (piece.type) {
    case PieceType.PAWN:
      table = PAWN_TABLE;
      break;
    case PieceType.KNIGHT:
      table = KNIGHT_TABLE;
      break;
    case PieceType.BISHOP:
      table = BISHOP_TABLE;
      break;
    case PieceType.ROOK:
      table = ROOK_TABLE;
      break;
    case PieceType.QUEEN:
      table = QUEEN_TABLE;
      break;
    case PieceType.KING:
      table = isEndgame ? KING_ENDGAME_TABLE : KING_MIDDLE_TABLE;
      break;
    default:
      return 0;
  }
  
  // For white, use the table as-is (rank 0 = row 7 in table)
  // For black, flip the table vertically
  const rank = piece.color === PieceColor.WHITE ? 7 - position.rank : position.rank;
  const file = position.file;
  
  return table[rank][file];
}

/**
 * Check if the position is in endgame phase
 * Endgame is when both sides have no queens or
 * every side which has a queen has additionally no other pieces or one minor piece maximum
 */
function isEndgame(board: ChessBoard): boolean {
  let whiteQueens = 0;
  let blackQueens = 0;
  let whiteMinorMajor = 0;
  let blackMinorMajor = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (!piece) continue;
      
      if (piece.type === PieceType.QUEEN) {
        if (piece.color === PieceColor.WHITE) whiteQueens++;
        else blackQueens++;
      } else if (piece.type !== PieceType.PAWN && piece.type !== PieceType.KING) {
        if (piece.color === PieceColor.WHITE) whiteMinorMajor++;
        else blackMinorMajor++;
      }
    }
  }
  
  // No queens = endgame
  if (whiteQueens === 0 && blackQueens === 0) return true;
  
  // Queen with at most one minor piece = endgame
  if (whiteQueens === 1 && whiteMinorMajor <= 1 && blackQueens === 1 && blackMinorMajor <= 1) return true;
  if (whiteQueens === 0 && blackQueens === 1 && blackMinorMajor <= 1) return true;
  if (blackQueens === 0 && whiteQueens === 1 && whiteMinorMajor <= 1) return true;
  
  return false;
}

/**
 * Evaluate material balance
 */
function evaluateMaterial(board: ChessBoard): number {
  let score = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (!piece) continue;
      
      const value = PIECE_VALUES[piece.type];
      score += piece.color === PieceColor.WHITE ? value : -value;
    }
  }
  
  return score;
}

/**
 * Evaluate piece positions using piece-square tables
 */
function evaluatePiecePositions(board: ChessBoard, endgame: boolean): number {
  let score = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (!piece) continue;
      
      const posValue = getPieceSquareValue(piece, { file, rank }, endgame);
      score += piece.color === PieceColor.WHITE ? posValue : -posValue;
    }
  }
  
  return score;
}

/**
 * Evaluate pawn structure
 * Penalizes doubled, isolated, and backward pawns
 */
function evaluatePawnStructure(board: ChessBoard): number {
  let score = 0;
  const whitePawns: Position[] = [];
  const blackPawns: Position[] = [];
  
  // Collect pawn positions
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (piece?.type === PieceType.PAWN) {
        if (piece.color === PieceColor.WHITE) {
          whitePawns.push({ file, rank });
        } else {
          blackPawns.push({ file, rank });
        }
      }
    }
  }
  
  // Evaluate white pawns
  score += evaluatePawnGroup(whitePawns, PieceColor.WHITE);
  score -= evaluatePawnGroup(blackPawns, PieceColor.BLACK);
  
  return score;
}

/**
 * Evaluate a group of pawns for one color
 */
function evaluatePawnGroup(pawns: Position[], color: PieceColor): number {
  let score = 0;
  const pawnsByFile: number[][] = Array(8).fill(null).map(() => []);
  
  // Group pawns by file
  for (const pawn of pawns) {
    pawnsByFile[pawn.file].push(pawn.rank);
  }
  
  for (let file = 0; file < 8; file++) {
    const filePawns = pawnsByFile[file];
    
    // Doubled pawns penalty
    if (filePawns.length > 1) {
      score -= 20 * (filePawns.length - 1);
    }
    
    // Isolated pawns penalty
    const hasLeftNeighbor = file > 0 && pawnsByFile[file - 1].length > 0;
    const hasRightNeighbor = file < 7 && pawnsByFile[file + 1].length > 0;
    
    if (filePawns.length > 0 && !hasLeftNeighbor && !hasRightNeighbor) {
      score -= 15 * filePawns.length;
    }
    
    // Passed pawn bonus
    for (const rank of filePawns) {
      if (isPassedPawn({ file, rank }, color, pawnsByFile)) {
        // Bonus increases as pawn advances
        const advancement = color === PieceColor.WHITE ? rank : 7 - rank;
        score += 20 + advancement * 10;
      }
    }
  }
  
  return score;
}

/**
 * Check if a pawn is passed (no enemy pawns can block or capture it)
 */
function isPassedPawn(pawn: Position, color: PieceColor, enemyPawnsByFile: number[][]): boolean {
  const direction = color === PieceColor.WHITE ? 1 : -1;
  const targetRank = color === PieceColor.WHITE ? 7 : 0;
  
  // Check files that could block or capture
  for (let file = Math.max(0, pawn.file - 1); file <= Math.min(7, pawn.file + 1); file++) {
    for (const enemyRank of enemyPawnsByFile[file]) {
      // Check if enemy pawn is ahead
      if (color === PieceColor.WHITE && enemyRank > pawn.rank) return false;
      if (color === PieceColor.BLACK && enemyRank < pawn.rank) return false;
    }
  }
  
  return true;
}

/**
 * Evaluate king safety
 */
function evaluateKingSafety(board: ChessBoard, endgame: boolean): number {
  if (endgame) return 0; // King safety less important in endgame
  
  let score = 0;
  
  // Find kings
  let whiteKingPos: Position | null = null;
  let blackKingPos: Position | null = null;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (piece?.type === PieceType.KING) {
        if (piece.color === PieceColor.WHITE) {
          whiteKingPos = { file, rank };
        } else {
          blackKingPos = { file, rank };
        }
      }
    }
  }
  
  if (whiteKingPos) {
    score += evaluateKingShield(board, whiteKingPos, PieceColor.WHITE);
  }
  if (blackKingPos) {
    score -= evaluateKingShield(board, blackKingPos, PieceColor.BLACK);
  }
  
  return score;
}

/**
 * Evaluate pawn shield in front of king
 */
function evaluateKingShield(board: ChessBoard, kingPos: Position, color: PieceColor): number {
  let score = 0;
  const direction = color === PieceColor.WHITE ? 1 : -1;
  
  // Check pawns in front of king
  for (let df = -1; df <= 1; df++) {
    const file = kingPos.file + df;
    if (file < 0 || file > 7) continue;
    
    const rank = kingPos.rank + direction;
    if (rank < 0 || rank > 7) continue;
    
    const piece = board.getPiece({ file, rank });
    if (piece?.type === PieceType.PAWN && piece.color === color) {
      score += 10; // Pawn shield bonus
    }
  }
  
  return score;
}

/**
 * Evaluate mobility (number of legal moves)
 * This is a simplified version - full mobility requires move generation
 */
function evaluateMobility(board: ChessBoard): number {
  // Simplified: count pieces that have open lines
  let score = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board.getPiece({ file, rank });
      if (!piece) continue;
      
      let mobility = 0;
      
      // Simplified mobility based on piece type
      switch (piece.type) {
        case PieceType.KNIGHT:
          mobility = countKnightMobility(board, { file, rank });
          break;
        case PieceType.BISHOP:
          mobility = countSlidingMobility(board, { file, rank }, [[1,1], [1,-1], [-1,1], [-1,-1]]);
          break;
        case PieceType.ROOK:
          mobility = countSlidingMobility(board, { file, rank }, [[1,0], [-1,0], [0,1], [0,-1]]);
          break;
        case PieceType.QUEEN:
          mobility = countSlidingMobility(board, { file, rank }, [[1,1], [1,-1], [-1,1], [-1,-1], [1,0], [-1,0], [0,1], [0,-1]]);
          break;
      }
      
      const mobilityBonus = mobility * 2;
      score += piece.color === PieceColor.WHITE ? mobilityBonus : -mobilityBonus;
    }
  }
  
  return score;
}

/**
 * Count knight mobility
 */
function countKnightMobility(board: ChessBoard, pos: Position): number {
  const moves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  
  let count = 0;
  const piece = board.getPiece(pos);
  
  for (const [df, dr] of moves) {
    const newFile = pos.file + df;
    const newRank = pos.rank + dr;
    
    if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
      const target = board.getPiece({ file: newFile, rank: newRank });
      if (!target || target.color !== piece?.color) {
        count++;
      }
    }
  }
  
  return count;
}

/**
 * Count sliding piece mobility
 */
function countSlidingMobility(board: ChessBoard, pos: Position, directions: number[][]): number {
  let count = 0;
  const piece = board.getPiece(pos);
  
  for (const [df, dr] of directions) {
    let newFile = pos.file + df;
    let newRank = pos.rank + dr;
    
    while (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
      const target = board.getPiece({ file: newFile, rank: newRank });
      
      if (!target) {
        count++;
      } else {
        if (target.color !== piece?.color) {
          count++;
        }
        break;
      }
      
      newFile += df;
      newRank += dr;
    }
  }
  
  return count;
}

/**
 * Main evaluation function
 * Returns score in centipawns from White's perspective
 * Positive = White is better, Negative = Black is better
 */
export function evaluatePosition(board: ChessBoard): number {
  const endgame = isEndgame(board);
  
  let score = 0;
  
  // Material (most important)
  score += evaluateMaterial(board);
  
  // Piece positions
  score += evaluatePiecePositions(board, endgame);
  
  // Pawn structure
  score += evaluatePawnStructure(board);
  
  // King safety
  score += evaluateKingSafety(board, endgame);
  
  // Mobility
  score += evaluateMobility(board);
  
  return score;
}

/**
 * Get a human-readable evaluation
 */
export function getEvaluationDisplay(score: number): string {
  const pawns = score / 100;
  if (Math.abs(pawns) >= 100) {
    return pawns > 0 ? '+M' : '-M'; // Mate
  }
  return (pawns >= 0 ? '+' : '') + pawns.toFixed(2);
}

/**
 * Classify move quality based on evaluation change
 */
export type MoveQuality = 'brilliant' | 'great' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';

export function classifyMoveQuality(evalBefore: number, evalAfter: number, isWhiteMove: boolean): MoveQuality {
  // Normalize to the moving player's perspective
  const evalChange = isWhiteMove ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
  
  if (evalChange >= 200) return 'brilliant';
  if (evalChange >= 100) return 'great';
  if (evalChange >= 0) return 'good';
  if (evalChange >= -50) return 'book';
  if (evalChange >= -100) return 'inaccuracy';
  if (evalChange >= -200) return 'mistake';
  return 'blunder';
}