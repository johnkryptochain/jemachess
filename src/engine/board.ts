/**
 * Chess Board Representation
 * 
 * Handles the 8x8 board state, piece placement, and board manipulation.
 * Uses file (0-7 = a-h) and rank (0-7 = 1-8) coordinate system.
 * Rank 0 is rank 1 (white's back rank), rank 7 is rank 8 (black's back rank).
 */

import { Piece, PieceType, PieceColor, Position, Square } from '../types';

/**
 * ChessBoard class representing the 8x8 chess board
 */
export class ChessBoard {
  private board: Square[][];

  constructor() {
    this.board = this.createEmptyBoard();
  }

  /**
   * Creates an empty 8x8 board
   */
  private createEmptyBoard(): Square[][] {
    const board: Square[][] = [];
    for (let rank = 0; rank < 8; rank++) {
      board[rank] = [];
      for (let file = 0; file < 8; file++) {
        board[rank][file] = null;
      }
    }
    return board;
  }

  /**
   * Sets up the initial chess position
   */
  setupInitialPosition(): void {
    this.board = this.createEmptyBoard();

    // Set up white pieces (rank 0 and 1)
    this.setupBackRank(0, PieceColor.WHITE);
    this.setupPawnRank(1, PieceColor.WHITE);

    // Set up black pieces (rank 6 and 7)
    this.setupPawnRank(6, PieceColor.BLACK);
    this.setupBackRank(7, PieceColor.BLACK);
  }

  /**
   * Sets up the back rank pieces for a given color
   */
  private setupBackRank(rank: number, color: PieceColor): void {
    const pieces: PieceType[] = [
      PieceType.ROOK,
      PieceType.KNIGHT,
      PieceType.BISHOP,
      PieceType.QUEEN,
      PieceType.KING,
      PieceType.BISHOP,
      PieceType.KNIGHT,
      PieceType.ROOK,
    ];

    for (let file = 0; file < 8; file++) {
      this.board[rank][file] = { type: pieces[file], color };
    }
  }

  /**
   * Sets up the pawn rank for a given color
   */
  private setupPawnRank(rank: number, color: PieceColor): void {
    for (let file = 0; file < 8; file++) {
      this.board[rank][file] = { type: PieceType.PAWN, color };
    }
  }

  /**
   * Gets the piece at a given position
   */
  getPiece(position: Position): Piece | null {
    if (!this.isValidPosition(position)) {
      return null;
    }
    return this.board[position.rank][position.file];
  }

  /**
   * Sets a piece at a given position
   */
  setPiece(position: Position, piece: Piece | null): void {
    if (this.isValidPosition(position)) {
      this.board[position.rank][position.file] = piece;
    }
  }

  /**
   * Moves a piece from one position to another
   */
  movePiece(from: Position, to: Position): Piece | null {
    const piece = this.getPiece(from);
    const captured = this.getPiece(to);
    
    if (piece) {
      this.setPiece(to, piece);
      this.setPiece(from, null);
    }
    
    return captured;
  }

  /**
   * Creates a deep clone of the board
   */
  clone(): ChessBoard {
    const newBoard = new ChessBoard();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          newBoard.board[rank][file] = { ...piece };
        }
      }
    }
    return newBoard;
  }

  /**
   * Checks if a position is within the board bounds
   */
  isValidPosition(position: Position): boolean {
    return (
      position.file >= 0 &&
      position.file < 8 &&
      position.rank >= 0 &&
      position.rank < 8
    );
  }

  /**
   * Gets the raw board array
   */
  getBoard(): Square[][] {
    return this.board;
  }

  /**
   * Finds the position of the king for a given color
   */
  findKing(color: PieceColor): Position | null {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          return { file, rank };
        }
      }
    }
    return null;
  }

  /**
   * Gets all pieces of a given color
   */
  getPiecesByColor(color: PieceColor): { piece: Piece; position: Position }[] {
    const pieces: { piece: Piece; position: Position }[] = [];
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === color) {
          pieces.push({ piece, position: { file, rank } });
        }
      }
    }
    
    return pieces;
  }

  /**
   * Converts the board to FEN notation (board part only)
   */
  toFEN(): string {
    const rows: string[] = [];

    // FEN starts from rank 8 (index 7) to rank 1 (index 0)
    for (let rank = 7; rank >= 0; rank--) {
      let row = '';
      let emptyCount = 0;

      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        
        if (piece === null) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            row += emptyCount.toString();
            emptyCount = 0;
          }
          row += this.pieceToFEN(piece);
        }
      }

      if (emptyCount > 0) {
        row += emptyCount.toString();
      }

      rows.push(row);
    }

    return rows.join('/');
  }

  /**
   * Loads a board position from FEN notation (board part only)
   */
  fromFEN(fen: string): void {
    this.board = this.createEmptyBoard();
    
    const rows = fen.split('/');
    
    // FEN starts from rank 8 (index 7) to rank 1 (index 0)
    for (let i = 0; i < rows.length && i < 8; i++) {
      const rank = 7 - i;
      let file = 0;
      
      for (const char of rows[i]) {
        if (file >= 8) break;
        
        const digit = parseInt(char, 10);
        if (!isNaN(digit)) {
          // Empty squares
          file += digit;
        } else {
          // Piece
          const piece = this.fenToPiece(char);
          if (piece) {
            this.board[rank][file] = piece;
          }
          file++;
        }
      }
    }
  }

  /**
   * Converts a piece to its FEN character
   */
  private pieceToFEN(piece: Piece): string {
    const char = piece.type; // PieceType values are already lowercase letters
    return piece.color === PieceColor.WHITE ? char.toUpperCase() : char;
  }

  /**
   * Converts a FEN character to a piece
   */
  private fenToPiece(char: string): Piece | null {
    const color = char === char.toUpperCase() ? PieceColor.WHITE : PieceColor.BLACK;
    const type = char.toLowerCase();
    
    const validTypes = Object.values(PieceType) as string[];
    if (validTypes.includes(type)) {
      return { type: type as PieceType, color };
    }
    
    return null;
  }

  /**
   * Checks if a square is empty
   */
  isEmpty(position: Position): boolean {
    return this.getPiece(position) === null;
  }

  /**
   * Checks if a square contains an enemy piece
   */
  isEnemy(position: Position, color: PieceColor): boolean {
    const piece = this.getPiece(position);
    return piece !== null && piece.color !== color;
  }

  /**
   * Checks if a square contains a friendly piece
   */
  isFriendly(position: Position, color: PieceColor): boolean {
    const piece = this.getPiece(position);
    return piece !== null && piece.color === color;
  }

  /**
   * Creates a string representation of the board for debugging
   */
  toString(): string {
    let result = '  a b c d e f g h\n';
    
    for (let rank = 7; rank >= 0; rank--) {
      result += `${rank + 1} `;
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          result += this.pieceToFEN(piece) + ' ';
        } else {
          result += '. ';
        }
      }
      result += `${rank + 1}\n`;
    }
    
    result += '  a b c d e f g h';
    return result;
  }
}