/**
 * Chess AI Module
 *
 * Implements a chess AI using minimax algorithm with alpha-beta pruning.
 * Supports multiple difficulty levels with optimized performance.
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
  quiescenceDepth: number;
  randomness: number; // Random factor to add variety (0-100 centipawns)
  maxTimeMs: number; // Maximum time in milliseconds
  maxNodes: number; // Maximum nodes to search
}

const DIFFICULTY_CONFIG: Record<AIDifficulty, AIConfig> = {
  easy: { maxDepth: 1, useQuiescence: false, quiescenceDepth: 0, randomness: 100, maxTimeMs: 50, maxNodes: 200 },
  medium: { maxDepth: 1, useQuiescence: false, quiescenceDepth: 0, randomness: 50, maxTimeMs: 100, maxNodes: 500 },
  hard: { maxDepth: 1, useQuiescence: false, quiescenceDepth: 0, randomness: 10, maxTimeMs: 150, maxNodes: 800 },
  master: { maxDepth: 2, useQuiescence: false, quiescenceDepth: 0, randomness: 0, maxTimeMs: 200, maxNodes: 1500 },
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
  private maxTableSize: number = 50000;
  private searchStartTime: number = 0;
  private shouldStop: boolean = false;

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
   * Check if search should stop due to time or node limits
   */
  private checkLimits(): boolean {
    if (this.shouldStop) return true;
    
    // Check node limit
    if (this.nodesSearched >= this.config.maxNodes) {
      this.shouldStop = true;
      return true;
    }
    
    // Check time limit more frequently (every 100 nodes)
    if (this.nodesSearched % 100 === 0) {
      const elapsed = Date.now() - this.searchStartTime;
      if (elapsed >= this.config.maxTimeMs) {
        this.shouldStop = true;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the best move for the current position
   */
  getBestMove(game: ChessGame): Move | null {
    this.nodesSearched = 0;
    this.shouldStop = false;
    this.searchStartTime = Date.now();
    
    // Clear transposition table if it's too large
    if (this.transpositionTable.size > this.maxTableSize / 2) {
      this.transpositionTable.clear();
    }

    const moves = game.getAllCurrentLegalMoves();
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0]; // Only one legal move

    const isMaximizing = game.currentTurn === PieceColor.WHITE;
    let bestMove: Move | null = moves[0]; // Default to first move
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Order moves for better pruning
    const orderedMoves = this.orderMoves(moves, game);

    // Use iterative deepening for better time management
    for (let depth = 1; depth <= this.config.maxDepth; depth++) {
      if (this.shouldStop) break;
      
      let depthBestMove: Move | null = null;
      let depthBestScore = isMaximizing ? -Infinity : Infinity;

      for (const move of orderedMoves) {
        if (this.shouldStop) break;
        
        // Make the move on a copy
        const gameCopy = this.cloneGame(game);
        gameCopy.makeMove(move);

        // Search
        const score = this.minimax(
          gameCopy,
          depth - 1,
          -Infinity,
          Infinity,
          !isMaximizing
        );

        if (this.shouldStop && depthBestMove === null) {
          // If we stopped mid-search and have no result for this depth, use previous depth's result
          break;
        }

        // Add randomness for variety (especially at lower difficulties)
        const randomFactor = (Math.random() - 0.5) * this.config.randomness;
        const adjustedScore = score + randomFactor;

        if (isMaximizing) {
          if (adjustedScore > depthBestScore) {
            depthBestScore = adjustedScore;
            depthBestMove = move;
          }
        } else {
          if (adjustedScore < depthBestScore) {
            depthBestScore = adjustedScore;
            depthBestMove = move;
          }
        }
      }

      // Only update best move if we completed this depth
      if (depthBestMove !== null && !this.shouldStop) {
        bestMove = depthBestMove;
        bestScore = depthBestScore;
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

    // Check limits periodically
    if (this.checkLimits()) {
      return evaluatePosition(game.getBoard());
    }

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
        return this.quiescence(game, alpha, beta, isMaximizing, this.config.quiescenceDepth);
      }
      return evaluatePosition(game.getBoard());
    }

    const moves = game.getAllCurrentLegalMoves();
    if (moves.length === 0) {
      return this.evaluateTerminal(game);
    }

    // Order moves for better pruning - limit to top moves for performance
    const orderedMoves = this.orderMoves(moves, game);
    // Limit moves aggressively to prevent lag
    const maxMoves = depth <= 1 ? 6 : 8;
    const movesToSearch = orderedMoves.slice(0, Math.min(orderedMoves.length, maxMoves));

    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMove: Move | undefined;
    let flag: 'exact' | 'lowerbound' | 'upperbound' = 'exact';

    for (const move of movesToSearch) {
      if (this.shouldStop) break;
      
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

    // Store in transposition table (only if not stopped)
    if (!this.shouldStop && this.transpositionTable.size < this.maxTableSize) {
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
   * Optimized with delta pruning and limited depth
   */
  private quiescence(
    game: ChessGame,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    depth: number
  ): number {
    this.nodesSearched++;

    // Check limits
    if (this.shouldStop) {
      return evaluatePosition(game.getBoard());
    }

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

    // Order captures by MVV-LVA and limit to best captures
    const orderedCaptures = this.orderCaptures(captures).slice(0, 5);

    for (const move of orderedCaptures) {
      if (this.shouldStop) break;
      
      // Delta pruning - skip if capture can't improve alpha
      const captureValue = move.captured ? PIECE_VALUES[move.captured.type] : 0;
      if (isMaximizing && standPat + captureValue + 200 < alpha) continue;
      if (!isMaximizing && standPat - captureValue - 200 > beta) continue;
      
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