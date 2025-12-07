/**
 * Copyright (c) 2025 Jema Technology.
 * Distributed under the license specified in the root directory of this project.
 *
 * Game Review Component
 *
 * Allows reviewing a completed game move by move:
 * - Navigate through move history
 * - Show evaluation at each position
 * - Highlight mistakes and blunders
 * - Display move quality indicators
 */

import { ChessGame, ChessAI, evaluatePosition, getEvaluationDisplay, classifyMoveQuality, MoveQuality } from '../../engine';
import { Move, PieceColor, Position } from '../../types';

/**
 * Move analysis data
 */
interface MoveAnalysis {
  move: Move;
  evalBefore: number;
  evalAfter: number;
  quality: MoveQuality;
  bestMove?: Move;
}

/**
 * Quality colors for move indicators
 */
const QUALITY_COLORS: Record<MoveQuality, string> = {
  brilliant: '#1baca6',
  great: '#5c8bb0',
  good: '#96bc4b',
  book: '#a88865',
  inaccuracy: '#f7c631',
  mistake: '#e58f2a',
  blunder: '#ca3431',
};

/**
 * Quality symbols
 */
const QUALITY_SYMBOLS: Record<MoveQuality, string> = {
  brilliant: '!!',
  great: '!',
  good: '✓',
  book: '📖',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/**
 * GameReview class
 */
export class GameReview {
  private container: HTMLElement;
  private reviewElement: HTMLElement | null = null;
  private originalGame: ChessGame;
  private reviewGame: ChessGame;
  private ai: ChessAI;
  private moveAnalyses: MoveAnalysis[] = [];
  private currentMoveIndex: number = -1;
  private isAnalyzing: boolean = false;
  private isVisible: boolean = false;

  // Callbacks
  public onPositionChange: ((game: ChessGame, moveIndex: number) => void) | null = null;
  public onClose: (() => void) | null = null;

  constructor(container: HTMLElement, game: ChessGame) {
    this.container = container;
    this.originalGame = game;
    this.reviewGame = new ChessGame();
    this.ai = new ChessAI('hard');
  }

  /**
   * Render the game review panel
   */
  render(): void {
    if (this.reviewElement) {
      this.reviewElement.remove();
    }

    this.reviewElement = document.createElement('div');
    this.reviewElement.className = 'game-review';
    this.reviewElement.innerHTML = `
      <div class="review-header">
        <h3>Game Review</h3>
        <button class="review-close-btn" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="review-controls">
        <button class="review-btn" data-action="start" title="Go to start">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>
        <button class="review-btn" data-action="prev" title="Previous move">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button class="review-btn" data-action="next" title="Next move">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
        <button class="review-btn" data-action="end" title="Go to end">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>
      
      <div class="review-position-info">
        <span class="move-number">Start</span>
        <span class="evaluation">0.00</span>
      </div>
      
      <div class="review-move-list"></div>
      
      <div class="review-analysis">
        <div class="analysis-status">Click "Analyze Game" to review</div>
        <button class="analyze-game-btn">Analyze Game</button>
      </div>
      
      <div class="review-summary" style="display: none;">
        <h4>Game Summary</h4>
        <div class="summary-stats"></div>
      </div>
    `;

    this.addStyles();
    this.setupEventListeners();
    this.container.appendChild(this.reviewElement);
    this.isVisible = true;

    // Initialize review game
    this.reviewGame.reset();
    this.currentMoveIndex = -1;
    this.renderMoveList();
  }

  /**
   * Add component styles
   */
  private addStyles(): void {
    const styleId = 'game-review-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .game-review {
        background: rgba(30, 30, 30, 0.95);
        border-radius: 8px;
        padding: 16px;
        color: #fff;
        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
        max-width: 320px;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .review-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .review-close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
      }
      
      .review-close-btn:hover {
        color: #fff;
      }
      
      .review-controls {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .review-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        color: #ccc;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .review-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      
      .review-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .review-position-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 16px;
      }
      
      .move-number {
        font-weight: 600;
      }
      
      .evaluation {
        font-family: 'Courier New', monospace;
        font-weight: bold;
      }
      
      .evaluation.positive { color: #f0f0f0; }
      .evaluation.negative { color: #888; }
      
      .review-move-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 16px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 8px;
      }
      
      .move-row {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .move-row:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .move-row.active {
        background: rgba(100, 150, 255, 0.2);
      }
      
      .move-row .move-num {
        width: 30px;
        color: #666;
        font-size: 12px;
      }
      
      .move-row .white-move,
      .move-row .black-move {
        flex: 1;
        padding: 2px 4px;
      }
      
      .move-row .move-quality {
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 3px;
        margin-left: 4px;
      }
      
      .review-analysis {
        text-align: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 16px;
      }
      
      .analysis-status {
        color: #888;
        font-size: 13px;
        margin-bottom: 12px;
      }
      
      .analysis-status.analyzing {
        color: #fc6;
      }
      
      .analyze-game-btn {
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        border: none;
        border-radius: 6px;
        padding: 10px 20px;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .analyze-game-btn:hover {
        transform: translateY(-1px);
      }
      
      .analyze-game-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .review-summary h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #ccc;
      }
      
      .summary-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .stat-item {
        background: rgba(255, 255, 255, 0.05);
        padding: 8px;
        border-radius: 4px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 18px;
        font-weight: bold;
      }
      
      .stat-label {
        font-size: 11px;
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.reviewElement) return;

    // Navigation buttons
    const buttons = this.reviewElement.querySelectorAll('.review-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        switch (action) {
          case 'start':
            this.goToMove(-1);
            break;
          case 'prev':
            this.goToMove(this.currentMoveIndex - 1);
            break;
          case 'next':
            this.goToMove(this.currentMoveIndex + 1);
            break;
          case 'end':
            this.goToMove(this.originalGame.moveHistory.length - 1);
            break;
        }
      });
    });

    // Close button
    const closeBtn = this.reviewElement.querySelector('.review-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onClose) {
        this.onClose();
      }
    });

    // Analyze button
    const analyzeBtn = this.reviewElement.querySelector('.analyze-game-btn');
    analyzeBtn?.addEventListener('click', () => {
      this.analyzeGame();
    });

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => {
      if (!this.isVisible) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          this.goToMove(this.currentMoveIndex - 1);
          break;
        case 'ArrowRight':
          this.goToMove(this.currentMoveIndex + 1);
          break;
        case 'Home':
          this.goToMove(-1);
          break;
        case 'End':
          this.goToMove(this.originalGame.moveHistory.length - 1);
          break;
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Render the move list
   */
  private renderMoveList(): void {
    if (!this.reviewElement) return;

    const moveList = this.reviewElement.querySelector('.review-move-list');
    if (!moveList) return;

    const moves = this.originalGame.moveHistory;
    let html = '';

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      const whiteAnalysis = this.moveAnalyses[i];
      const blackAnalysis = this.moveAnalyses[i + 1];

      html += `
        <div class="move-row ${this.currentMoveIndex === i || this.currentMoveIndex === i + 1 ? 'active' : ''}">
          <span class="move-num">${moveNum}.</span>
          <span class="white-move" data-index="${i}">
            ${this.moveToNotation(whiteMove)}
            ${whiteAnalysis ? this.getQualityBadge(whiteAnalysis.quality) : ''}
          </span>
          ${blackMove ? `
            <span class="black-move" data-index="${i + 1}">
              ${this.moveToNotation(blackMove)}
              ${blackAnalysis ? this.getQualityBadge(blackAnalysis.quality) : ''}
            </span>
          ` : '<span class="black-move"></span>'}
        </div>
      `;
    }

    moveList.innerHTML = html;

    // Add click handlers for moves
    const moveElements = moveList.querySelectorAll('[data-index]');
    moveElements.forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.getAttribute('data-index') || '0', 10);
        this.goToMove(index);
      });
    });
  }

  /**
   * Get quality badge HTML
   */
  private getQualityBadge(quality: MoveQuality): string {
    const color = QUALITY_COLORS[quality];
    const symbol = QUALITY_SYMBOLS[quality];
    return `<span class="move-quality" style="background: ${color}; color: ${quality === 'inaccuracy' ? '#000' : '#fff'}">${symbol}</span>`;
  }

  /**
   * Convert move to notation
   */
  private moveToNotation(move: Move): string {
    const files = 'abcdefgh';
    let notation = '';

    if (move.piece.type !== 'p') {
      notation += move.piece.type.toUpperCase();
    }

    if (move.captured) {
      if (move.piece.type === 'p') {
        notation += files[move.from.file];
      }
      notation += 'x';
    }

    notation += files[move.to.file] + (move.to.rank + 1);

    if (move.promotion) {
      notation += '=' + move.promotion.toUpperCase();
    }

    if (move.isCheckmate) {
      notation += '#';
    } else if (move.isCheck) {
      notation += '+';
    }

    return notation;
  }

  /**
   * Go to a specific move
   */
  goToMove(index: number): void {
    const moves = this.originalGame.moveHistory;
    index = Math.max(-1, Math.min(index, moves.length - 1));

    if (index === this.currentMoveIndex) return;

    // Reset and replay to the target position
    this.reviewGame.reset();
    
    for (let i = 0; i <= index; i++) {
      this.reviewGame.makeMove(moves[i]);
    }

    this.currentMoveIndex = index;
    this.updatePositionInfo();
    this.renderMoveList();

    if (this.onPositionChange) {
      this.onPositionChange(this.reviewGame, index);
    }
  }

  /**
   * Update position info display
   */
  private updatePositionInfo(): void {
    if (!this.reviewElement) return;

    const moveNumber = this.reviewElement.querySelector('.move-number');
    const evaluation = this.reviewElement.querySelector('.evaluation');

    if (moveNumber) {
      if (this.currentMoveIndex < 0) {
        moveNumber.textContent = 'Start';
      } else {
        const moveNum = Math.floor(this.currentMoveIndex / 2) + 1;
        const isWhite = this.currentMoveIndex % 2 === 0;
        moveNumber.textContent = `${moveNum}. ${isWhite ? '' : '...'}${this.moveToNotation(this.originalGame.moveHistory[this.currentMoveIndex])}`;
      }
    }

    if (evaluation) {
      const analysis = this.moveAnalyses[this.currentMoveIndex];
      if (analysis) {
        const evalDisplay = getEvaluationDisplay(analysis.evalAfter);
        evaluation.textContent = evalDisplay;
        evaluation.classList.toggle('positive', analysis.evalAfter >= 0);
        evaluation.classList.toggle('negative', analysis.evalAfter < 0);
      } else {
        const currentEval = evaluatePosition(this.reviewGame.getBoard());
        const evalDisplay = getEvaluationDisplay(currentEval);
        evaluation.textContent = evalDisplay;
        evaluation.classList.toggle('positive', currentEval >= 0);
        evaluation.classList.toggle('negative', currentEval < 0);
      }
    }
  }

  /**
   * Analyze the entire game
   */
  async analyzeGame(): Promise<void> {
    if (this.isAnalyzing || !this.reviewElement) return;

    this.isAnalyzing = true;
    this.moveAnalyses = [];

    const analyzeBtn = this.reviewElement.querySelector('.analyze-game-btn') as HTMLButtonElement;
    const statusEl = this.reviewElement.querySelector('.analysis-status');

    if (analyzeBtn) analyzeBtn.disabled = true;
    if (statusEl) {
      statusEl.textContent = 'Analyzing...';
      statusEl.classList.add('analyzing');
    }

    const moves = this.originalGame.moveHistory;
    const tempGame = new ChessGame();
    tempGame.reset();

    let prevEval = 0;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isWhiteMove = i % 2 === 0;

      // Get evaluation before move
      const evalBefore = evaluatePosition(tempGame.getBoard());

      // Make the move
      tempGame.makeMove(move);

      // Get evaluation after move
      const evalAfter = evaluatePosition(tempGame.getBoard());

      // Classify move quality
      const quality = classifyMoveQuality(evalBefore, evalAfter, isWhiteMove);

      this.moveAnalyses.push({
        move,
        evalBefore,
        evalAfter,
        quality,
      });

      // Update progress
      if (statusEl) {
        statusEl.textContent = `Analyzing move ${i + 1}/${moves.length}...`;
      }

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isAnalyzing = false;

    if (analyzeBtn) analyzeBtn.disabled = false;
    if (statusEl) {
      statusEl.textContent = 'Analysis complete';
      statusEl.classList.remove('analyzing');
    }

    this.renderMoveList();
    this.updatePositionInfo();
    this.showSummary();
  }

  /**
   * Show game summary
   */
  private showSummary(): void {
    if (!this.reviewElement) return;

    const summaryEl = this.reviewElement.querySelector('.review-summary') as HTMLElement;
    const statsEl = this.reviewElement.querySelector('.summary-stats');

    if (!summaryEl || !statsEl) return;

    // Count move qualities
    const whiteMoves = this.moveAnalyses.filter((_, i) => i % 2 === 0);
    const blackMoves = this.moveAnalyses.filter((_, i) => i % 2 === 1);

    const countQuality = (moves: MoveAnalysis[], qualities: MoveQuality[]) =>
      moves.filter(m => qualities.includes(m.quality)).length;

    const whiteGood = countQuality(whiteMoves, ['brilliant', 'great', 'good']);
    const whiteBad = countQuality(whiteMoves, ['inaccuracy', 'mistake', 'blunder']);
    const blackGood = countQuality(blackMoves, ['brilliant', 'great', 'good']);
    const blackBad = countQuality(blackMoves, ['inaccuracy', 'mistake', 'blunder']);

    statsEl.innerHTML = `
      <div class="stat-item">
        <div class="stat-value" style="color: #f0f0f0">${whiteGood}</div>
        <div class="stat-label">White Good</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #333">${blackGood}</div>
        <div class="stat-label">Black Good</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: ${QUALITY_COLORS.mistake}">${whiteBad}</div>
        <div class="stat-label">White Errors</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: ${QUALITY_COLORS.mistake}">${blackBad}</div>
        <div class="stat-label">Black Errors</div>
      </div>
    `;

    summaryEl.style.display = 'block';
  }

  /**
   * Get the review game (for board display)
   */
  getReviewGame(): ChessGame {
    return this.reviewGame;
  }

  /**
   * Show the review panel
   */
  show(): void {
    if (!this.reviewElement) {
      this.render();
    } else {
      this.reviewElement.style.display = 'block';
    }
    this.isVisible = true;
  }

  /**
   * Hide the review panel
   */
  hide(): void {
    if (this.reviewElement) {
      this.reviewElement.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Check if visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    if (this.reviewElement) {
      this.reviewElement.remove();
      this.reviewElement = null;
    }
    this.isVisible = false;
  }
}