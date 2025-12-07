/**
 * Copyright (c) 2025 Jema Technology.
 * Distributed under the license specified in the root directory of this project.
 *
 * Analysis Panel Component
 *
 * Displays position analysis including:
 * - Evaluation bar
 * - Best move suggestion
 * - Move quality indicators
 * - Engine analysis info
 */

import { ChessGame, ChessAI, evaluatePosition, getEvaluationDisplay, classifyMoveQuality, MoveQuality } from '../../engine';
import { Move, PieceColor } from '../../types';

/**
 * Analysis result structure
 */
interface AnalysisResult {
  evaluation: number;
  evaluationDisplay: string;
  bestMove: Move | null;
  depth: number;
  isAnalyzing: boolean;
}

/**
 * Move quality colors
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
 * Move quality icons (Unicode symbols)
 */
const QUALITY_ICONS: Record<MoveQuality, string> = {
  brilliant: '!!',
  great: '!',
  good: '✓',
  book: '📖',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/**
 * AnalysisPanel class
 */
export class AnalysisPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement | null = null;
  private game: ChessGame;
  private ai: ChessAI;
  private currentAnalysis: AnalysisResult | null = null;
  private isVisible: boolean = false;
  private autoAnalyze: boolean = false;
  private analysisWorker: number | null = null;

  // Callbacks
  public onBestMoveClick: ((move: Move) => void) | null = null;

  constructor(container: HTMLElement, game: ChessGame) {
    this.container = container;
    this.game = game;
    this.ai = new ChessAI('hard'); // Use hard difficulty for analysis
  }

  /**
   * Render the analysis panel
   */
  render(): void {
    if (this.panelElement) {
      this.panelElement.remove();
    }

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'analysis-panel';
    this.panelElement.innerHTML = `
      <div class="analysis-header">
        <h3>Analysis</h3>
        <div class="analysis-controls">
          <button class="analysis-btn analyze-btn" title="Analyze position">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <button class="analysis-btn auto-analyze-btn ${this.autoAnalyze ? 'active' : ''}" title="Auto-analyze">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="evaluation-section">
        <div class="eval-bar-container">
          <div class="eval-bar">
            <div class="eval-bar-white"></div>
            <div class="eval-bar-black"></div>
          </div>
        </div>
        <div class="eval-display">
          <span class="eval-value">0.00</span>
        </div>
      </div>
      
      <div class="best-move-section">
        <div class="best-move-label">Best Move</div>
        <div class="best-move-value">-</div>
      </div>
      
      <div class="analysis-info">
        <span class="depth-info">Depth: -</span>
        <span class="status-info">Ready</span>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Setup event listeners
    this.setupEventListeners();

    this.container.appendChild(this.panelElement);
    this.isVisible = true;

    // Initial analysis if auto-analyze is on
    if (this.autoAnalyze) {
      this.analyze();
    }
  }

  /**
   * Add component styles
   */
  private addStyles(): void {
    const styleId = 'analysis-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .analysis-panel {
        background: rgba(30, 30, 30, 0.95);
        border-radius: 8px;
        padding: 16px;
        color: #fff;
        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
        min-width: 200px;
      }
      
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .analysis-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #ccc;
      }
      
      .analysis-controls {
        display: flex;
        gap: 8px;
      }
      
      .analysis-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        color: #ccc;
        transition: all 0.2s;
      }
      
      .analysis-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      
      .analysis-btn.active {
        background: rgba(100, 200, 100, 0.3);
        color: #6c6;
      }
      
      .evaluation-section {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .eval-bar-container {
        flex: 1;
        height: 24px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .eval-bar {
        display: flex;
        height: 100%;
        transition: all 0.3s ease;
      }
      
      .eval-bar-white {
        background: linear-gradient(to right, #f0f0f0, #e0e0e0);
        width: 50%;
        transition: width 0.3s ease;
      }
      
      .eval-bar-black {
        background: linear-gradient(to right, #333, #222);
        width: 50%;
        transition: width 0.3s ease;
      }
      
      .eval-display {
        min-width: 60px;
        text-align: right;
      }
      
      .eval-value {
        font-size: 18px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
      }
      
      .eval-value.positive {
        color: #f0f0f0;
      }
      
      .eval-value.negative {
        color: #888;
      }
      
      .best-move-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 12px;
      }
      
      .best-move-label {
        font-size: 11px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      
      .best-move-value {
        font-size: 16px;
        font-weight: 600;
        color: #6c6;
        cursor: pointer;
        transition: color 0.2s;
      }
      
      .best-move-value:hover {
        color: #8e8;
      }
      
      .best-move-value.no-move {
        color: #666;
        cursor: default;
      }
      
      .analysis-info {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #666;
      }
      
      .status-info.analyzing {
        color: #fc6;
      }
      
      /* Move quality badge */
      .move-quality-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .move-quality-badge.brilliant { background: ${QUALITY_COLORS.brilliant}; color: #fff; }
      .move-quality-badge.great { background: ${QUALITY_COLORS.great}; color: #fff; }
      .move-quality-badge.good { background: ${QUALITY_COLORS.good}; color: #fff; }
      .move-quality-badge.book { background: ${QUALITY_COLORS.book}; color: #fff; }
      .move-quality-badge.inaccuracy { background: ${QUALITY_COLORS.inaccuracy}; color: #000; }
      .move-quality-badge.mistake { background: ${QUALITY_COLORS.mistake}; color: #fff; }
      .move-quality-badge.blunder { background: ${QUALITY_COLORS.blunder}; color: #fff; }
    `;

    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.panelElement) return;

    const analyzeBtn = this.panelElement.querySelector('.analyze-btn');
    const autoAnalyzeBtn = this.panelElement.querySelector('.auto-analyze-btn');
    const bestMoveValue = this.panelElement.querySelector('.best-move-value');

    analyzeBtn?.addEventListener('click', () => this.analyze());
    
    autoAnalyzeBtn?.addEventListener('click', () => {
      this.autoAnalyze = !this.autoAnalyze;
      autoAnalyzeBtn.classList.toggle('active', this.autoAnalyze);
      if (this.autoAnalyze) {
        this.analyze();
      }
    });

    bestMoveValue?.addEventListener('click', () => {
      if (this.currentAnalysis?.bestMove && this.onBestMoveClick) {
        this.onBestMoveClick(this.currentAnalysis.bestMove);
      }
    });
  }

  /**
   * Analyze the current position
   */
  analyze(): void {
    if (!this.panelElement) return;

    // Update status
    const statusInfo = this.panelElement.querySelector('.status-info');
    if (statusInfo) {
      statusInfo.textContent = 'Analyzing...';
      statusInfo.classList.add('analyzing');
    }

    // Use setTimeout to allow UI to update
    if (this.analysisWorker) {
      clearTimeout(this.analysisWorker);
    }

    this.analysisWorker = window.setTimeout(() => {
      const result = this.ai.analyzePosition(this.game);
      
      this.currentAnalysis = {
        evaluation: result.evaluation,
        evaluationDisplay: getEvaluationDisplay(result.evaluation),
        bestMove: result.bestMove,
        depth: result.depth,
        isAnalyzing: false,
      };

      this.updateDisplay();
    }, 50);
  }

  /**
   * Update the display with current analysis
   */
  private updateDisplay(): void {
    if (!this.panelElement || !this.currentAnalysis) return;

    const { evaluation, evaluationDisplay, bestMove, depth } = this.currentAnalysis;

    // Update evaluation bar
    const evalBarWhite = this.panelElement.querySelector('.eval-bar-white') as HTMLElement;
    const evalBarBlack = this.panelElement.querySelector('.eval-bar-black') as HTMLElement;
    
    if (evalBarWhite && evalBarBlack) {
      // Convert evaluation to percentage (sigmoid-like function)
      const maxEval = 1000; // 10 pawns
      const clampedEval = Math.max(-maxEval, Math.min(maxEval, evaluation));
      const percentage = 50 + (clampedEval / maxEval) * 50;
      
      evalBarWhite.style.width = `${percentage}%`;
      evalBarBlack.style.width = `${100 - percentage}%`;
    }

    // Update evaluation display
    const evalValue = this.panelElement.querySelector('.eval-value');
    if (evalValue) {
      evalValue.textContent = evaluationDisplay;
      evalValue.classList.toggle('positive', evaluation >= 0);
      evalValue.classList.toggle('negative', evaluation < 0);
    }

    // Update best move
    const bestMoveValue = this.panelElement.querySelector('.best-move-value');
    if (bestMoveValue) {
      if (bestMove) {
        bestMoveValue.textContent = this.moveToNotation(bestMove);
        bestMoveValue.classList.remove('no-move');
      } else {
        bestMoveValue.textContent = '-';
        bestMoveValue.classList.add('no-move');
      }
    }

    // Update depth info
    const depthInfo = this.panelElement.querySelector('.depth-info');
    if (depthInfo) {
      depthInfo.textContent = `Depth: ${depth}`;
    }

    // Update status
    const statusInfo = this.panelElement.querySelector('.status-info');
    if (statusInfo) {
      statusInfo.textContent = 'Ready';
      statusInfo.classList.remove('analyzing');
    }
  }

  /**
   * Convert a move to algebraic notation
   */
  private moveToNotation(move: Move): string {
    const files = 'abcdefgh';
    const from = files[move.from.file] + (move.from.rank + 1);
    const to = files[move.to.file] + (move.to.rank + 1);
    
    let notation = '';
    
    // Piece letter
    if (move.piece.type !== 'p') {
      notation += move.piece.type.toUpperCase();
    }
    
    // From square (for clarity)
    notation += from;
    
    // Capture
    if (move.captured) {
      notation += 'x';
    } else {
      notation += '-';
    }
    
    // To square
    notation += to;
    
    // Promotion
    if (move.promotion) {
      notation += '=' + move.promotion.toUpperCase();
    }
    
    return notation;
  }

  /**
   * Update the game reference and re-analyze if auto-analyze is on
   */
  updateGame(game: ChessGame): void {
    this.game = game;
    if (this.autoAnalyze && this.isVisible) {
      this.analyze();
    }
  }

  /**
   * Get move quality badge HTML
   */
  static getMoveQualityBadge(quality: MoveQuality): string {
    return `<span class="move-quality-badge ${quality}">${QUALITY_ICONS[quality]} ${quality}</span>`;
  }

  /**
   * Classify a move and return its quality
   */
  classifyMove(evalBefore: number, evalAfter: number, isWhiteMove: boolean): MoveQuality {
    return classifyMoveQuality(evalBefore, evalAfter, isWhiteMove);
  }

  /**
   * Show the panel
   */
  show(): void {
    if (!this.panelElement) {
      this.render();
    } else {
      this.panelElement.style.display = 'block';
    }
    this.isVisible = true;
  }

  /**
   * Hide the panel
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Set auto-analyze mode
   */
  setAutoAnalyze(enabled: boolean): void {
    this.autoAnalyze = enabled;
    if (this.panelElement) {
      const btn = this.panelElement.querySelector('.auto-analyze-btn');
      btn?.classList.toggle('active', enabled);
    }
    if (enabled && this.isVisible) {
      this.analyze();
    }
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    if (this.analysisWorker) {
      clearTimeout(this.analysisWorker);
    }
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
    this.isVisible = false;
  }
}