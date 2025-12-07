/**
 * Chess AI Module
 * 
 * Implements a chess AI using minimax algorithm with alpha-beta pruning.
 * Supports multiple difficulty levels.
 */

import { ChessGame } from './game';
import { Move, PieceColor } from '../types';
import { evaluatePosition, PIECE_VALUES } from './evaluation';
import { ChessBoard } from './board';

/**
 * AI difficulty levels
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';

/**
 * AI configuration for each difficulty
 */
interface AIConfig {
  maxDepth: number;
  useQuiescence: boolean;
  randomness: number; // Random factor to add variety (0-100 centipawns)
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, AIConfig> = {
  easy: { maxDepth: 1, useQuiescence: false, randomness: 100 },
  medium: { maxDepth: 2, useQuiescence: false, randomness: 50 },
  hard: { maxDepth: 3, useQuiescence: true, randomness: 20 },
  master: { maxDepth: 4, useQuiescence: true, randomness: 0 },
};

/**
 * Transposition table entry
 */
interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lowerbound' | 'upperbound';
  bestMove?: Move;
}

/**
 * Chess AI class
 */
export class ChessAI {
  private config: AIConfig;
  private transpositionTable: Map<string, TTEntry> = new Map();
  private nodesSearched: number = 0;
  private maxTableSize: number = 100000;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.config = DIFFICULTY_CONFIG[difficulty];
  }

  /**
   * Set the AI difficulty
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.config = DIFFICULTY_CONFIG[difficulty];
    this.transpositionTable.clear();
  }

  /**
   * Get the best move for the current position
   */
  getBestMove(game: ChessGame): Move | null {
    this.nodesSearched = 0;
    this.transpositionTable.clear();

    const moves = game.getAllCurrentLegalMoves();
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0]; // Only one legal move

    const isMaximizing = game.currentTurn === PieceColor.WHITE;
    let bestMove: Move | null = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Order moves for better pruning
    const orderedMoves = this.orderMoves(moves, game);

    for (const move of orderedMoves) {
      // Make the move
      const gameCopy = this.cloneGame(game);
      gameCopy.makeMove(move);

      // Search
      const score = this.minimax(
        gameCopy,
        this.config.maxDepth - 1,
        -Infinity,
        Infinity,
        !isMaximizing
      );

      // Add randomness for variety (especially at lower difficulties)
      const randomFactor = (Math.random() - 0.5) * this.config.randomness;
      const adjustedScore = score + randomFactor;

      if (isMaximizing) {
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestMove = move;
        }
      } else {
        if (adjustedScore < bestScore) {
          bestScore = adjustedScore;
          bestMove = move;
        }
      }
    }

    console.log(`AI searched ${this.nodesSearched} nodes, best score: ${bestScore}`);
    return bestMove;
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    game: ChessGame,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    this.nodesSearched++;

    // Check transposition table
    const posKey = game.toFEN();
    const ttEntry = this.transpositionTable.get(posKey);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 'exact') return ttEntry.score;
      if (ttEntry.flag === 'lowerbound') alpha = Math.max(alpha, ttEntry.score);
      if (ttEntry.flag === 'upperbound') beta = Math.min(beta, ttEntry.score);
      if (alpha >= beta) return ttEntry.score;
    }

    // Terminal conditions
    if (game.isGameOver()) {
      return this.evaluateTerminal(game);
    }

    if (depth <= 0) {
      if (this.config.useQuiescence) {
        return this.quiescence(game, alpha, beta, isMaximizing, 4);
      }
      return evaluatePosition(game.getBoard());
    }

    const moves = game.getAllCurrentLegalMoves();
    if (moves.length === 0) {
      return this.evaluateTerminal(game);
    }

    // Order moves for better pruning
    const orderedMoves = this.orderMoves(moves, game);

    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMove: Move | undefined;
    let flag: 'exact' | 'lowerbound' | 'upperbound' = 'exact';

    for (const move of orderedMoves) {
      const gameCopy = this.cloneGame(game);
      gameCopy.makeMove(move);

      const score = this.minimax(gameCopy, depth - 1, alpha, beta, !isMaximizing);

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
      }

      if (beta <= alpha) {
        flag = isMaximizing ? 'lowerbound' : 'upperbound';
        break; // Alpha-beta cutoff
      }
    }

    // Store in transposition table
    if (this.transpositionTable.size < this.maxTableSize) {
      this.transpositionTable.set(posKey, {
        depth,
        score: bestScore,
        flag,
        bestMove,
      });
    }

    return bestScore;
  }

  /**
   * Quiescence search - search captures until position is quiet
   */
  private quiescence(
    game: ChessGame,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    depth: number
  ): number {
    this.nodesSearched++;

    const standPat = evaluatePosition(game.getBoard());

    if (depth <= 0) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }

    // Get only capture moves
    const moves = game.getAllCurrentLegalMoves();
    const captures = moves.filter(m => m.captured);

    if (captures.length === 0) return standPat;

    // Order captures by MVV-LVA
    const orderedCaptures = this.orderCaptures(captures);

    for (const move of orderedCaptures) {
      const gameCopy = this.cloneGame(game);
      gameCopy.makeMove(move);

      const score = this.quiescence(gameCopy, alpha, beta, !isMaximizing, depth - 1);

      if (isMaximizing) {
        if (score >= beta) return beta;
        alpha = Math.max(alpha, score);
      } else {
        if (score <= alpha) return alpha;
        beta = Math.min(beta, score);
      }
    }

    return isMaximizing ? alpha : beta;
  }

  /**
   * Evaluate terminal positions (checkmate, stalemate, etc.)
   */
  private evaluateTerminal(game: ChessGame): number {
    const status = game.getGameStatus();

    // Checkmate
    if (status.includes('checkmate')) {
      // Return a large value, adjusted by move count to prefer faster mates
      const mateScore = 100000;
      if (status.includes('white_wins')) {
        return mateScore - game.moveHistory.length;
      } else {
        return -mateScore + game.moveHistory.length;
      }
    }

    // Draw
    return 0;
  }

  /**
   * Order moves for better alpha-beta pruning
   * Good move ordering significantly improves search efficiency
   */
  private orderMoves(moves: Move[], game: ChessGame): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Captures are usually good - use MVV-LVA
      if (a.captured) {
        scoreA += 1000 + PIECE_VALUES[a.captured.type] - PIECE_VALUES[a.piece.type] / 10;
      }
      if (b.captured) {
        scoreB += 1000 + PIECE_VALUES[b.captured.type] - PIECE_VALUES[b.piece.type] / 10;
      }

      // Promotions are very good
      if (a.promotion) scoreA += 900;
      if (b.promotion) scoreB += 900;

      // Checks are often good
      if (a.isCheck) scoreA += 500;
      if (b.isCheck) scoreB += 500;

      // Checkmates are best
      if (a.isCheckmate) scoreA += 10000;
      if (b.isCheckmate) scoreB += 10000;

      // Center control for non-captures
      if (!a.captured) {
        const centerDist = Math.abs(a.to.file - 3.5) + Math.abs(a.to.rank - 3.5);
        scoreA += (7 - centerDist) * 10;
      }
      if (!b.captured) {
        const centerDist = Math.abs(b.to.file - 3.5) + Math.abs(b.to.rank - 3.5);
        scoreB += (7 - centerDist) * 10;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Order captures by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
   */
  private orderCaptures(captures: Move[]): Move[] {
    return captures.sort((a, b) => {
      const scoreA = a.captured ? PIECE_VALUES[a.captured.type] - PIECE_VALUES[a.piece.type] / 10 : 0;
      const scoreB = b.captured ? PIECE_VALUES[b.captured.type] - PIECE_VALUES[b.piece.type] / 10 : 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Clone a game for search
   */
  private cloneGame(game: ChessGame): ChessGame {
    const newGame = new ChessGame();
    newGame.fromFEN(game.toFEN());
    return newGame;
  }

  /**
   * Get a hint for the current position
   * Returns the best move without making it
   */
  getHint(game: ChessGame): Move | null {
    return this.getBestMove(game);
  }

  /**
   * Get a fast hint for the current position (instant response)
   * Uses depth 1 for immediate feedback
   */
  getFastHint(game: ChessGame): Move | null {
    this.nodesSearched = 0;

    const moves = game.getAllCurrentLegalMoves();
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const isMaximizing = game.currentTurn === PieceColor.WHITE;
    let bestMove: Move | null = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Order moves for better selection
    const orderedMoves = this.orderMoves(moves, game);

    // Simple 1-ply search for instant response
    for (const move of orderedMoves) {
      const gameCopy = this.cloneGame(game);
      gameCopy.makeMove(move);

      // Just evaluate the position after the move
      const score = evaluatePosition(gameCopy.getBoard());

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  /**
   * Analyze a position and return evaluation
   */
  analyzePosition(game: ChessGame): {
    evaluation: number;
    bestMove: Move | null;
    depth: number;
  } {
    const bestMove = this.getBestMove(game);
    const evaluation = evaluatePosition(game.getBoard());

    return {
      evaluation,
      bestMove,
      depth: this.config.maxDepth,
    };
  }

  /**
   * Get the number of nodes searched in the last search
   */
  getNodesSearched(): number {
    return this.nodesSearched;
  }
}

/**
 * Create an AI instance with the specified difficulty
 */
export function createAI(difficulty: AIDifficulty = 'medium'): ChessAI {
  return new ChessAI(difficulty);
}