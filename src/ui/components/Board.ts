/**
 * Chess Board Component
 * 
 * Renders the chess board with pieces and handles user interactions
 * including click-to-move and drag-and-drop.
 */

import { ChessGame } from '../../engine';
import { Position, Move, PieceTheme, PieceColor, Piece, MoveType, PieceType } from '../../types';
import { PieceRenderer } from './Piece';

/**
 * Board class that renders the chess board and handles interactions
 */
export class Board {
  private container: HTMLElement;
  private game: ChessGame;
  private boardElement: HTMLElement | null = null;
  private selectedSquare: Position | null = null;
  private legalMoves: Move[] = [];
  private pieceTheme: PieceTheme = PieceTheme.CLASSIC;
  private flipped: boolean = false;
  private lastMove: { from: Position; to: Position } | null = null;
  private showCoordinates: boolean = true;
  private showLegalMoves: boolean = true;
  
  // Drag and drop state
  private draggedPiece: HTMLElement | null = null;
  private draggedFrom: Position | null = null;
  private ghostPiece: HTMLElement | null = null;
  
  // Premove state
  private premoveEnabled: boolean = true;
  private premove: { from: Position; to: Position; promotion?: PieceType } | null = null;
  private playerColor: PieceColor | null = null; // The color the player is playing as
  
  // Update batching to prevent multiple rapid updates
  private pendingUpdate: boolean = false;
  
  // Event callbacks
  public onMove: ((move: Move) => void) | null = null;
  public onSquareClick: ((position: Position) => void) | null = null;
  public onPromotionRequired: ((from: Position, to: Position, color: PieceColor) => Promise<PieceType>) | null = null;
  public onPremove: ((from: Position, to: Position) => void) | null = null;

  constructor(container: HTMLElement, game: ChessGame) {
    this.container = container;
    this.game = game;
    
    // Bind event handlers
    this.handleSquareClick = this.handleSquareClick.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragMove = this.handleDragMove.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Renders the board
   */
  render(): void {
    // Clear container
    this.container.innerHTML = '';
    
    // Create board wrapper with coordinates
    const wrapper = document.createElement('div');
    wrapper.className = 'board-wrapper';
    
    // Create the board element
    this.boardElement = document.createElement('div');
    this.boardElement.className = 'chess-board';
    
    // Render squares
    this.renderSquares();
    
    // Add coordinates if enabled
    if (this.showCoordinates) {
      this.renderCoordinates(wrapper);
    }
    
    wrapper.appendChild(this.boardElement);
    this.container.appendChild(wrapper);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Renders all squares on the board
   */
  private renderSquares(): void {
    if (!this.boardElement) return;
    
    this.boardElement.innerHTML = '';
    const board = this.game.getBoard();
    
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const displayRank = this.flipped ? 7 - rank : rank;
        const displayFile = this.flipped ? 7 - file : file;
        
        const square = this.createSquare(displayFile, displayRank);
        this.boardElement.appendChild(square);
      }
    }
  }

  /**
   * Creates a square element
   */
  private createSquare(file: number, rank: number): HTMLElement {
    const square = document.createElement('div');
    const isLight = (file + rank) % 2 === 1;
    
    square.className = `square ${isLight ? 'light' : 'dark'}`;
    square.dataset.file = file.toString();
    square.dataset.rank = rank.toString();
    
    // Add coordinate labels on edge squares
    if (this.showCoordinates) {
      // File coordinate on bottom row
      if ((this.flipped && rank === 7) || (!this.flipped && rank === 0)) {
        const fileCoord = document.createElement('span');
        fileCoord.className = 'coordinate file';
        fileCoord.textContent = String.fromCharCode('a'.charCodeAt(0) + file);
        square.appendChild(fileCoord);
      }
      
      // Rank coordinate on left column
      if ((this.flipped && file === 7) || (!this.flipped && file === 0)) {
        const rankCoord = document.createElement('span');
        rankCoord.className = 'coordinate rank';
        rankCoord.textContent = (rank + 1).toString();
        square.appendChild(rankCoord);
      }
    }
    
    // Check for piece at this position
    const position: Position = { file, rank };
    const piece = this.game.getPieceAt(position);
    
    if (piece) {
      const pieceElement = PieceRenderer.createElement(piece, this.pieceTheme);
      pieceElement.dataset.file = file.toString();
      pieceElement.dataset.rank = rank.toString();
      square.appendChild(pieceElement);
      square.classList.add('has-piece');
    }
    
    // Highlight selected square
    if (this.selectedSquare &&
        this.selectedSquare.file === file &&
        this.selectedSquare.rank === rank) {
      square.classList.add('selected');
    }
    
    // Highlight legal moves
    if (this.showLegalMoves && this.legalMoves.length > 0) {
      const isLegalMove = this.legalMoves.some(
        move => move.to.file === file && move.to.rank === rank
      );
      if (isLegalMove) {
        square.classList.add('legal-move');
      }
    }
    
    // Highlight last move
    if (this.lastMove) {
      if ((this.lastMove.from.file === file && this.lastMove.from.rank === rank) ||
          (this.lastMove.to.file === file && this.lastMove.to.rank === rank)) {
        square.classList.add('last-move');
      }
    }
    
    // Highlight premove squares
    if (this.premove) {
      if ((this.premove.from.file === file && this.premove.from.rank === rank) ||
          (this.premove.to.file === file && this.premove.to.rank === rank)) {
        square.classList.add('premove');
      }
    }
    
    // Highlight check
    if (piece && piece.type === PieceType.KING &&
        piece.color === this.game.currentTurn &&
        this.game.isCurrentPlayerInCheck()) {
      square.classList.add('check');
    }
    
    return square;
  }

  /**
   * Renders board coordinates
   */
  private renderCoordinates(wrapper: HTMLElement): void {
    // File coordinates (a-h)
    const files = document.createElement('div');
    files.className = 'board-coordinates files';
    for (let i = 0; i < 8; i++) {
      const file = this.flipped ? 7 - i : i;
      const coord = document.createElement('span');
      coord.textContent = String.fromCharCode('a'.charCodeAt(0) + file);
      files.appendChild(coord);
    }
    wrapper.appendChild(files);
    
    // Rank coordinates (1-8)
    const ranks = document.createElement('div');
    ranks.className = 'board-coordinates ranks';
    for (let i = 7; i >= 0; i--) {
      const rank = this.flipped ? 7 - i : i;
      const coord = document.createElement('span');
      coord.textContent = (rank + 1).toString();
      ranks.appendChild(coord);
    }
    wrapper.appendChild(ranks);
  }

  /**
   * Sets up event listeners for the board
   */
  private setupEventListeners(): void {
    if (!this.boardElement) return;
    
    // Click events
    this.boardElement.addEventListener('click', this.handleSquareClick);
    
    // Mouse drag events
    this.boardElement.addEventListener('mousedown', this.handleDragStart);
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragEnd);
    
    // Touch events for mobile
    this.boardElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Handles square click events
   */
  private handleSquareClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const square = target.closest('.square') as HTMLElement;
    
    if (!square) return;
    
    const file = parseInt(square.dataset.file || '0', 10);
    const rank = parseInt(square.dataset.rank || '0', 10);
    const position: Position = { file, rank };
    
    // Notify listeners
    if (this.onSquareClick) {
      this.onSquareClick(position);
    }
    
    this.selectSquare(position);
  }

  /**
   * Handles drag start
   */
  private handleDragStart(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.classList.contains('piece')) return;
    
    const file = parseInt(target.dataset.file || '0', 10);
    const rank = parseInt(target.dataset.rank || '0', 10);
    const position: Position = { file, rank };
    
    const piece = this.game.getPieceAt(position);
    if (!piece) return;
    
    // Check if it's the current turn
    const isCurrentTurn = piece.color === this.game.currentTurn;
    
    // In online games, only allow moving your own color
    // playerColor is set for online games, null for local games
    const isPlayersPiece = this.playerColor === null || piece.color === this.playerColor;
    
    // Allow dragging if:
    // 1. It's your piece AND it's your turn (normal move)
    // 2. It's your piece but not your turn (premove, if enabled)
    const canMove = isPlayersPiece && isCurrentTurn;
    const canPremove = this.premoveEnabled && isPlayersPiece && !isCurrentTurn;
    
    if (!canMove && !canPremove) return;
    
    event.preventDefault();
    
    this.draggedPiece = target;
    this.draggedFrom = position;
    
    // Select the square to show legal moves (or potential premove squares)
    this.selectSquare(position);
    
    // Create ghost piece
    this.createGhostPiece(target, event.clientX, event.clientY);
    
    // Hide original piece
    target.classList.add('dragging');
  }

  /**
   * Handles drag move
   */
  private handleDragMove(event: MouseEvent): void {
    if (!this.ghostPiece) return;
    
    event.preventDefault();
    this.updateGhostPosition(event.clientX, event.clientY);
  }

  /**
   * Handles drag end
   */
  private async handleDragEnd(event: MouseEvent): Promise<void> {
    if (!this.draggedPiece || !this.draggedFrom) {
      this.cleanupDrag();
      return;
    }
    
    // Find the square under the cursor
    const square = this.getSquareAtPoint(event.clientX, event.clientY);
    
    if (square) {
      const file = parseInt(square.dataset.file || '0', 10);
      const rank = parseInt(square.dataset.rank || '0', 10);
      const to: Position = { file, rank };
      
      await this.tryMove(this.draggedFrom, to);
    }
    
    this.cleanupDrag();
  }

  /**
   * Handles touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const target = touch.target as HTMLElement;
    
    if (!target.classList.contains('piece')) return;
    
    const file = parseInt(target.dataset.file || '0', 10);
    const rank = parseInt(target.dataset.rank || '0', 10);
    const position: Position = { file, rank };
    
    const piece = this.game.getPieceAt(position);
    if (!piece) return;
    
    // Check if it's the current turn
    const isCurrentTurn = piece.color === this.game.currentTurn;
    
    // In online games, only allow moving your own color
    // playerColor is set for online games, null for local games
    const isPlayersPiece = this.playerColor === null || piece.color === this.playerColor;
    
    // Allow dragging if:
    // 1. It's your piece AND it's your turn (normal move)
    // 2. It's your piece but not your turn (premove, if enabled)
    const canMove = isPlayersPiece && isCurrentTurn;
    const canPremove = this.premoveEnabled && isPlayersPiece && !isCurrentTurn;
    
    if (!canMove && !canPremove) return;
    
    event.preventDefault();
    
    this.draggedPiece = target;
    this.draggedFrom = position;
    
    // Select the square to show legal moves
    this.selectSquare(position);
    
    // Create ghost piece
    this.createGhostPiece(target, touch.clientX, touch.clientY);
    
    // Hide original piece
    target.classList.add('dragging');
  }

  /**
   * Handles touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.ghostPiece || event.touches.length !== 1) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    this.updateGhostPosition(touch.clientX, touch.clientY);
  }

  /**
   * Handles touch end
   */
  private async handleTouchEnd(event: TouchEvent): Promise<void> {
    if (!this.draggedPiece || !this.draggedFrom) {
      this.cleanupDrag();
      return;
    }
    
    const touch = event.changedTouches[0];
    const square = this.getSquareAtPoint(touch.clientX, touch.clientY);
    
    if (square) {
      const file = parseInt(square.dataset.file || '0', 10);
      const rank = parseInt(square.dataset.rank || '0', 10);
      const to: Position = { file, rank };
      
      await this.tryMove(this.draggedFrom, to);
    }
    
    this.cleanupDrag();
  }

  /**
   * Creates a ghost piece for dragging
   */
  private createGhostPiece(pieceElement: HTMLElement, x: number, y: number): void {
    this.ghostPiece = pieceElement.cloneNode(true) as HTMLElement;
    this.ghostPiece.className = 'piece-ghost';
    this.ghostPiece.style.position = 'fixed';
    this.ghostPiece.style.pointerEvents = 'none';
    this.ghostPiece.style.zIndex = '1000';
    this.ghostPiece.style.width = `${pieceElement.offsetWidth}px`;
    this.ghostPiece.style.height = `${pieceElement.offsetHeight}px`;
    
    this.updateGhostPosition(x, y);
    document.body.appendChild(this.ghostPiece);
  }

  /**
   * Updates ghost piece position
   */
  private updateGhostPosition(x: number, y: number): void {
    if (!this.ghostPiece) return;
    
    this.ghostPiece.style.left = `${x}px`;
    this.ghostPiece.style.top = `${y}px`;
    this.ghostPiece.style.transform = 'translate(-50%, -50%)';
  }

  /**
   * Gets the square element at a given point
   */
  private getSquareAtPoint(x: number, y: number): HTMLElement | null {
    // Temporarily hide ghost to get element underneath
    if (this.ghostPiece) {
      this.ghostPiece.style.display = 'none';
    }
    
    const element = document.elementFromPoint(x, y);
    
    if (this.ghostPiece) {
      this.ghostPiece.style.display = '';
    }
    
    if (!element) return null;
    
    return element.closest('.square') as HTMLElement;
  }

  /**
   * Cleans up drag state
   */
  private cleanupDrag(): void {
    if (this.draggedPiece) {
      this.draggedPiece.classList.remove('dragging');
    }
    
    if (this.ghostPiece) {
      this.ghostPiece.remove();
    }
    
    this.draggedPiece = null;
    this.draggedFrom = null;
    this.ghostPiece = null;
  }

  /**
   * Attempts to make a move
   */
  private async tryMove(from: Position, to: Position): Promise<void> {
    const piece = this.game.getPieceAt(from);
    
    // Check if this is a premove situation
    if (piece && this.premoveEnabled && this.playerColor &&
        piece.color === this.playerColor && piece.color !== this.game.currentTurn) {
      // This is a premove - queue it
      this.setPremove(from, to);
      this.clearSelection();
      return;
    }
    
    // Find matching legal move
    const legalMove = this.legalMoves.find(
      move => move.to.file === to.file && move.to.rank === to.rank
    );
    
    if (!legalMove) {
      // If clicking on own piece, select it instead
      const targetPiece = this.game.getPieceAt(to);
      if (targetPiece && targetPiece.color === this.game.currentTurn) {
        this.selectSquare(to);
      } else {
        this.clearSelection();
      }
      return;
    }
    
    // Handle promotion
    if (legalMove.moveType === MoveType.PROMOTION) {
      if (piece && this.onPromotionRequired) {
        const promotionPiece = await this.onPromotionRequired(from, to, piece.color);
        
        // Find the move with the selected promotion piece
        const promotionMove = this.legalMoves.find(
          move => move.to.file === to.file &&
                  move.to.rank === to.rank &&
                  move.promotion === promotionPiece
        );
        
        if (promotionMove) {
          this.executeMove(promotionMove);
        }
      }
      return;
    }
    
    this.executeMove(legalMove);
  }

  /**
   * Executes a move
   */
  private executeMove(move: Move): void {
    const success = this.game.makeMove(move);
    
    if (success) {
      this.lastMove = { from: move.from, to: move.to };
      this.clearSelection();
      this.update();
      
      if (this.onMove) {
        this.onMove(move);
      }
    }
  }

  /**
   * Selects a square
   */
  selectSquare(position: Position): void {
    const piece = this.game.getPieceAt(position);
    
    // Check if it's the current turn
    const isCurrentTurn = piece && piece.color === this.game.currentTurn;
    
    // In online games, only allow selecting your own color
    // playerColor is set for online games, null for local games
    const isPlayersPiece = piece && (this.playerColor === null || piece.color === this.playerColor);
    
    // If clicking on own piece and it's your turn, select it
    if (piece && isPlayersPiece && isCurrentTurn) {
      this.selectedSquare = position;
      this.legalMoves = this.game.getLegalMoves(position);
      this.update();
      return;
    }
    
    // If clicking on player's piece but not their turn (premove)
    if (piece && this.premoveEnabled && isPlayersPiece && !isCurrentTurn) {
      this.selectedSquare = position;
      // For premoves, we show all pseudo-legal moves (simplified - just show where piece could go)
      this.legalMoves = this.getPremoveMoves(position);
      this.update();
      return;
    }
    
    // If a piece is selected and clicking on a legal move target
    if (this.selectedSquare && this.legalMoves.length > 0) {
      this.tryMove(this.selectedSquare, position);
      return;
    }
    
    // Otherwise clear selection
    this.clearSelection();
  }

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.update();
  }

  /**
   * Get potential premove destinations for a piece
   * This is a simplified version that shows where the piece could potentially move
   */
  private getPremoveMoves(position: Position): Move[] {
    // For premoves, we return pseudo-legal moves based on piece type
    // This is simplified - in a real implementation you might want more sophisticated logic
    const piece = this.game.getPieceAt(position);
    if (!piece) return [];
    
    // Use the game's legal move generator but for the piece's color
    // This gives us a reasonable approximation of where the piece could move
    const moves: Move[] = [];
    const board = this.game.getBoard();
    
    // Generate basic moves based on piece type
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const to: Position = { file, rank };
        if (this.isValidPremoveTarget(position, to, piece)) {
          moves.push({
            from: position,
            to,
            piece,
            moveType: MoveType.NORMAL,
            isCheck: false,
            isCheckmate: false,
          });
        }
      }
    }
    
    return moves;
  }

  /**
   * Check if a target square is a valid premove destination
   */
  private isValidPremoveTarget(from: Position, to: Position, piece: Piece): boolean {
    // Can't move to same square
    if (from.file === to.file && from.rank === to.rank) return false;
    
    const df = to.file - from.file;
    const dr = to.rank - from.rank;
    const adf = Math.abs(df);
    const adr = Math.abs(dr);
    
    switch (piece.type) {
      case PieceType.PAWN:
        const direction = piece.color === PieceColor.WHITE ? 1 : -1;
        // Forward moves
        if (df === 0 && dr === direction) return true;
        if (df === 0 && dr === 2 * direction &&
            ((piece.color === PieceColor.WHITE && from.rank === 1) ||
             (piece.color === PieceColor.BLACK && from.rank === 6))) return true;
        // Captures (diagonal)
        if (adf === 1 && dr === direction) return true;
        return false;
        
      case PieceType.KNIGHT:
        return (adf === 2 && adr === 1) || (adf === 1 && adr === 2);
        
      case PieceType.BISHOP:
        return adf === adr && adf > 0;
        
      case PieceType.ROOK:
        return (df === 0 || dr === 0) && (adf > 0 || adr > 0);
        
      case PieceType.QUEEN:
        return (adf === adr && adf > 0) || ((df === 0 || dr === 0) && (adf > 0 || adr > 0));
        
      case PieceType.KING:
        // Normal king moves
        if (adf <= 1 && adr <= 1 && (adf > 0 || adr > 0)) return true;
        // Castling
        if (dr === 0 && adf === 2) return true;
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Set a premove
   */
  setPremove(from: Position, to: Position, promotion?: PieceType): void {
    this.premove = { from, to, promotion };
    this.update();
    
    if (this.onPremove) {
      this.onPremove(from, to);
    }
  }

  /**
   * Clear the current premove
   */
  clearPremove(): void {
    this.premove = null;
    this.update();
  }

  /**
   * Get the current premove
   */
  getPremove(): { from: Position; to: Position; promotion?: PieceType } | null {
    return this.premove;
  }

  /**
   * Try to execute the queued premove
   * Call this after opponent makes a move
   */
  tryExecutePremove(): boolean {
    if (!this.premove) return false;
    
    const { from, to, promotion } = this.premove;
    this.clearPremove();
    
    // Check if the premove is now legal
    const legalMoves = this.game.getLegalMoves(from);
    const matchingMove = legalMoves.find(
      move => move.to.file === to.file && move.to.rank === to.rank &&
              (!promotion || move.promotion === promotion)
    );
    
    if (matchingMove) {
      this.executeMove(matchingMove);
      return true;
    }
    
    return false;
  }

  /**
   * Set the player's color (for premove support)
   */
  setPlayerColor(color: PieceColor | null): void {
    this.playerColor = color;
  }

  /**
   * Enable or disable premoves
   */
  setPremoveEnabled(enabled: boolean): void {
    this.premoveEnabled = enabled;
    if (!enabled) {
      this.clearPremove();
    }
  }

  /**
   * Check if premoves are enabled
   */
  isPremoveEnabled(): boolean {
    return this.premoveEnabled;
  }

  /**
   * Updates the board display
   * Uses requestAnimationFrame to batch multiple rapid updates
   */
  update(): void {
    if (this.pendingUpdate) return;
    this.pendingUpdate = true;
    requestAnimationFrame(() => {
      this.renderSquares();
      this.pendingUpdate = false;
    });
  }

  /**
   * Sets the piece theme
   */
  setTheme(theme: PieceTheme): void {
    this.pieceTheme = theme;
    PieceRenderer.preloadTheme(theme).then(() => {
      this.update();
    });
  }

  /**
   * Gets the current theme
   */
  getTheme(): PieceTheme {
    return this.pieceTheme;
  }

  /**
   * Flips the board orientation
   */
  flip(): void {
    this.flipped = !this.flipped;
    if (this.boardElement) {
      this.boardElement.classList.add('flipping');
      setTimeout(() => {
        this.render();
        this.boardElement?.classList.remove('flipping');
      }, 250);
    }
  }

  /**
   * Sets the board orientation
   */
  setFlipped(flipped: boolean): void {
    if (this.flipped !== flipped) {
      this.flip();
    }
  }

  /**
   * Gets whether the board is flipped
   */
  isFlipped(): boolean {
    return this.flipped;
  }

  /**
   * Highlights the last move
   */
  highlightLastMove(from: Position, to: Position): void {
    this.lastMove = { from, to };
    this.update();
  }

  /**
   * Highlights check on the king
   */
  highlightCheck(): void {
    // Check highlighting is handled in createSquare
    this.update();
  }

  /**
   * Clears all highlights
   */
  clearHighlights(): void {
    this.lastMove = null;
    this.update();
  }

  /**
   * Sets whether to show coordinates
   */
  setShowCoordinates(show: boolean): void {
    this.showCoordinates = show;
    this.render();
  }

  /**
   * Sets whether to show legal moves
   */
  setShowLegalMoves(show: boolean): void {
    this.showLegalMoves = show;
    this.update();
  }

  /**
   * Gets the piece image path
   */
  private getPieceImagePath(piece: Piece): string {
    return PieceRenderer.getImageUrl(piece, this.pieceTheme);
  }

  /**
   * Destroys the board and cleans up event listeners
   */
  destroy(): void {
    if (this.boardElement) {
      this.boardElement.removeEventListener('click', this.handleSquareClick);
      this.boardElement.removeEventListener('mousedown', this.handleDragStart);
      this.boardElement.removeEventListener('touchstart', this.handleTouchStart);
    }
    
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    this.cleanupDrag();
    this.container.innerHTML = '';
  }
}