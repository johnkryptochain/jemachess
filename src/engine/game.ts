/**
 * Chess Game State Management
 * 
 * The ChessGame class manages the complete game state including
 * the board, move history, captured pieces, and game status.
 */

import {
  Piece,
  PieceType,
  PieceColor,
  Position,
  Move,
  MoveType,
  GameStatus,
  CastlingRights,
} from '../types';
import { ChessBoard } from './board';
import { getAllLegalMoves, getLegalMovesForPosition } from './moves';
import {
  isInCheck,
  isCheckmate,
  isStalemate,
  hasInsufficientMaterial,
  isThreefoldRepetition,
  updateCastlingRights,
  getEnPassantTarget,
  givesCheck,
  givesCheckmate,
} from './validation';

/**
 * Initial FEN for standard chess starting position
 */
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * ChessGame class managing the complete game state
 */
export class ChessGame {
  private board: ChessBoard;
  private _currentTurn: PieceColor;
  private _moveHistory: Move[];
  private _capturedPieces: Piece[];
  private _gameStatus: GameStatus;
  private _castlingRights: CastlingRights;
  private _enPassantTarget: Position | null;
  private _halfMoveClock: number;
  private _fullMoveNumber: number;
  private _positionHistory: string[];

  constructor() {
    this.board = new ChessBoard();
    this._currentTurn = PieceColor.WHITE;
    this._moveHistory = [];
    this._capturedPieces = [];
    this._gameStatus = GameStatus.WAITING;
    this._castlingRights = {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    };
    this._enPassantTarget = null;
    this._halfMoveClock = 0;
    this._fullMoveNumber = 1;
    this._positionHistory = [];
  }

  // Getters
  get currentTurn(): PieceColor {
    return this._currentTurn;
  }

  get moveHistory(): Move[] {
    return [...this._moveHistory];
  }

  get capturedPieces(): Piece[] {
    return [...this._capturedPieces];
  }

  get gameStatus(): GameStatus {
    return this._gameStatus;
  }

  get castlingRights(): CastlingRights {
    return { ...this._castlingRights };
  }

  get enPassantTarget(): Position | null {
    return this._enPassantTarget ? { ...this._enPassantTarget } : null;
  }

  get halfMoveClock(): number {
    return this._halfMoveClock;
  }

  get fullMoveNumber(): number {
    return this._fullMoveNumber;
  }

  /**
   * Gets the current board
   */
  getBoard(): ChessBoard {
    return this.board;
  }

  /**
   * Resets the game to initial state
   */
  reset(): void {
    this.board = new ChessBoard();
    this.board.setupInitialPosition();
    this._currentTurn = PieceColor.WHITE;
    this._moveHistory = [];
    this._capturedPieces = [];
    this._gameStatus = GameStatus.IN_PROGRESS;
    this._castlingRights = {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    };
    this._enPassantTarget = null;
    this._halfMoveClock = 0;
    this._fullMoveNumber = 1;
    this._positionHistory = [this.toFEN()];
  }

  /**
   * Makes a move on the board
   * Returns true if the move was successful, false otherwise
   */
  makeMove(move: Move): boolean {
    // Check if game is still in progress
    if (this._gameStatus !== GameStatus.IN_PROGRESS) {
      return false;
    }

    // Check if it's the correct player's turn
    if (move.piece.color !== this._currentTurn) {
      return false;
    }

    // Verify the move is legal
    const legalMoves = this.getLegalMoves(move.from);
    const isLegal = legalMoves.some(
      (legalMove) =>
        legalMove.to.file === move.to.file &&
        legalMove.to.rank === move.to.rank &&
        legalMove.moveType === move.moveType &&
        (move.moveType !== MoveType.PROMOTION || legalMove.promotion === move.promotion)
    );

    if (!isLegal) {
      return false;
    }

    // Execute the move
    this.executeMove(move);

    // Update game state
    this.updateGameState(move);

    return true;
  }

  /**
   * Executes a move on the board (internal method)
   */
  private executeMove(move: Move): void {
    // Handle en passant capture
    if (move.moveType === MoveType.EN_PASSANT) {
      const capturedPawnPos: Position = {
        file: move.to.file,
        rank: move.from.rank,
      };
      const capturedPawn = this.board.getPiece(capturedPawnPos);
      if (capturedPawn) {
        this._capturedPieces.push(capturedPawn);
      }
      this.board.setPiece(capturedPawnPos, null);
    }

    // Handle castling - move the rook
    if (move.moveType === MoveType.CASTLING_KINGSIDE) {
      const rookFrom: Position = { file: 7, rank: move.from.rank };
      const rookTo: Position = { file: 5, rank: move.from.rank };
      this.board.movePiece(rookFrom, rookTo);
    } else if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
      const rookFrom: Position = { file: 0, rank: move.from.rank };
      const rookTo: Position = { file: 3, rank: move.from.rank };
      this.board.movePiece(rookFrom, rookTo);
    }

    // Handle regular capture
    if (move.captured && move.moveType !== MoveType.EN_PASSANT) {
      this._capturedPieces.push(move.captured);
    }

    // Make the main move
    this.board.movePiece(move.from, move.to);

    // Handle promotion
    if (move.moveType === MoveType.PROMOTION && move.promotion) {
      this.board.setPiece(move.to, { type: move.promotion, color: move.piece.color });
    }
  }

  /**
   * Updates the game state after a move
   */
  private updateGameState(move: Move): void {
    // Update castling rights
    this._castlingRights = updateCastlingRights(this._castlingRights, move);

    // Update en passant target
    this._enPassantTarget = getEnPassantTarget(move);

    // Update half-move clock (reset on pawn move or capture)
    if (move.piece.type === PieceType.PAWN || move.captured) {
      this._halfMoveClock = 0;
    } else {
      this._halfMoveClock++;
    }

    // Update full move number (after black's move)
    if (this._currentTurn === PieceColor.BLACK) {
      this._fullMoveNumber++;
    }

    // Update check/checkmate flags on the move
    const enemyColor = this._currentTurn === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    move.isCheck = isInCheck(this.board, enemyColor);
    move.isCheckmate = move.isCheck && isCheckmate(
      this.board,
      enemyColor,
      this._enPassantTarget,
      this._castlingRights
    );

    // Add move to history
    this._moveHistory.push(move);

    // Switch turn
    this._currentTurn = enemyColor;

    // Add position to history
    this._positionHistory.push(this.toFEN());

    // Update game status
    this.updateGameStatus();
  }

  /**
   * Updates the game status based on current state
   */
  private updateGameStatus(): void {
    // Check for checkmate
    if (isCheckmate(this.board, this._currentTurn, this._enPassantTarget, this._castlingRights)) {
      this._gameStatus = this._currentTurn === PieceColor.WHITE
        ? GameStatus.BLACK_WINS_CHECKMATE
        : GameStatus.WHITE_WINS_CHECKMATE;
      return;
    }

    // Check for stalemate
    if (isStalemate(this.board, this._currentTurn, this._enPassantTarget, this._castlingRights)) {
      this._gameStatus = GameStatus.DRAW_STALEMATE;
      return;
    }

    // Check for 50-move rule
    if (this._halfMoveClock >= 100) {
      this._gameStatus = GameStatus.DRAW_FIFTY_MOVES;
      return;
    }

    // Check for threefold repetition
    if (isThreefoldRepetition(this._positionHistory)) {
      this._gameStatus = GameStatus.DRAW_THREEFOLD_REPETITION;
      return;
    }

    // Check for insufficient material
    if (hasInsufficientMaterial(this.board)) {
      this._gameStatus = GameStatus.DRAW_INSUFFICIENT_MATERIAL;
      return;
    }

    this._gameStatus = GameStatus.IN_PROGRESS;
  }

  /**
   * Undoes the last move
   * Returns the undone move or null if no moves to undo
   */
  undoMove(): Move | null {
    if (this._moveHistory.length === 0) {
      return null;
    }

    const move = this._moveHistory.pop()!;

    // Restore the piece to its original position
    this.board.setPiece(move.from, move.piece);
    this.board.setPiece(move.to, null);

    // Handle en passant undo
    if (move.moveType === MoveType.EN_PASSANT && move.captured) {
      const capturedPawnPos: Position = {
        file: move.to.file,
        rank: move.from.rank,
      };
      this.board.setPiece(capturedPawnPos, move.captured);
      // Remove from captured pieces
      this._capturedPieces.pop();
    }

    // Handle castling undo
    if (move.moveType === MoveType.CASTLING_KINGSIDE) {
      const rookFrom: Position = { file: 5, rank: move.from.rank };
      const rookTo: Position = { file: 7, rank: move.from.rank };
      this.board.movePiece(rookFrom, rookTo);
    } else if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
      const rookFrom: Position = { file: 3, rank: move.from.rank };
      const rookTo: Position = { file: 0, rank: move.from.rank };
      this.board.movePiece(rookFrom, rookTo);
    }

    // Handle regular capture undo
    if (move.captured && move.moveType !== MoveType.EN_PASSANT) {
      this.board.setPiece(move.to, move.captured);
      this._capturedPieces.pop();
    }

    // Handle promotion undo (piece is already restored as pawn)

    // Switch turn back
    this._currentTurn = move.piece.color;

    // Update full move number
    if (this._currentTurn === PieceColor.BLACK) {
      this._fullMoveNumber--;
    }

    // Remove last position from history
    this._positionHistory.pop();

    // Recalculate state from position history
    this.recalculateStateFromHistory();

    return move;
  }

  /**
   * Recalculates game state from position history
   */
  private recalculateStateFromHistory(): void {
    if (this._positionHistory.length > 0) {
      // Parse the last FEN to get the state
      const lastFEN = this._positionHistory[this._positionHistory.length - 1];
      const parts = lastFEN.split(' ');
      
      // Recalculate castling rights from FEN
      if (parts[2]) {
        this._castlingRights = {
          whiteKingside: parts[2].includes('K'),
          whiteQueenside: parts[2].includes('Q'),
          blackKingside: parts[2].includes('k'),
          blackQueenside: parts[2].includes('q'),
        };
      }

      // Recalculate en passant target from FEN
      if (parts[3] && parts[3] !== '-') {
        const file = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = parseInt(parts[3][1], 10) - 1;
        this._enPassantTarget = { file, rank };
      } else {
        this._enPassantTarget = null;
      }

      // Recalculate half-move clock
      if (parts[4]) {
        this._halfMoveClock = parseInt(parts[4], 10);
      }
    }

    // Update game status
    this.updateGameStatus();
  }

  /**
   * Gets all legal moves for a piece at a given position
   */
  getLegalMoves(position: Position): Move[] {
    const piece = this.board.getPiece(position);
    if (!piece || piece.color !== this._currentTurn) {
      return [];
    }

    return getLegalMovesForPosition(
      this.board,
      position,
      this._enPassantTarget,
      this._castlingRights
    );
  }

  /**
   * Gets the current game status
   */
  getGameStatus(): GameStatus {
    return this._gameStatus;
  }

  /**
   * Checks if the game is over
   */
  isGameOver(): boolean {
    return (
      this._gameStatus !== GameStatus.WAITING &&
      this._gameStatus !== GameStatus.IN_PROGRESS
    );
  }

  /**
   * Exports the current position to FEN notation
   */
  toFEN(): string {
    const boardFEN = this.board.toFEN();
    const turn = this._currentTurn === PieceColor.WHITE ? 'w' : 'b';
    
    let castling = '';
    if (this._castlingRights.whiteKingside) castling += 'K';
    if (this._castlingRights.whiteQueenside) castling += 'Q';
    if (this._castlingRights.blackKingside) castling += 'k';
    if (this._castlingRights.blackQueenside) castling += 'q';
    if (castling === '') castling = '-';

    let enPassant = '-';
    if (this._enPassantTarget) {
      const file = String.fromCharCode('a'.charCodeAt(0) + this._enPassantTarget.file);
      const rank = this._enPassantTarget.rank + 1;
      enPassant = `${file}${rank}`;
    }

    return `${boardFEN} ${turn} ${castling} ${enPassant} ${this._halfMoveClock} ${this._fullMoveNumber}`;
  }

  /**
   * Imports a position from FEN notation
   */
  fromFEN(fen: string): void {
    const parts = fen.split(' ');
    
    if (parts.length < 4) {
      throw new Error('Invalid FEN: not enough parts');
    }

    // Parse board
    this.board.fromFEN(parts[0]);

    // Parse turn
    this._currentTurn = parts[1] === 'w' ? PieceColor.WHITE : PieceColor.BLACK;

    // Parse castling rights
    const castling = parts[2];
    this._castlingRights = {
      whiteKingside: castling.includes('K'),
      whiteQueenside: castling.includes('Q'),
      blackKingside: castling.includes('k'),
      blackQueenside: castling.includes('q'),
    };

    // Parse en passant target
    if (parts[3] !== '-') {
      const file = parts[3].charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parseInt(parts[3][1], 10) - 1;
      this._enPassantTarget = { file, rank };
    } else {
      this._enPassantTarget = null;
    }

    // Parse half-move clock
    this._halfMoveClock = parts[4] ? parseInt(parts[4], 10) : 0;

    // Parse full move number
    this._fullMoveNumber = parts[5] ? parseInt(parts[5], 10) : 1;

    // Reset move history and captured pieces
    this._moveHistory = [];
    this._capturedPieces = [];
    this._positionHistory = [fen];

    // Update game status
    this._gameStatus = GameStatus.IN_PROGRESS;
    this.updateGameStatus();
  }

  /**
   * Exports the game to PGN notation
   */
  exportPGN(): string {
    const headers: string[] = [
      '[Event "Chess Game"]',
      '[Site "Chess App"]',
      `[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]`,
      '[Round "1"]',
      '[White "Player 1"]',
      '[Black "Player 2"]',
      `[Result "${this.getPGNResult()}"]`,
    ];

    const moves: string[] = [];
    let moveNumber = 1;

    for (let i = 0; i < this._moveHistory.length; i++) {
      const move = this._moveHistory[i];
      
      if (i % 2 === 0) {
        moves.push(`${moveNumber}.`);
        moveNumber++;
      }

      moves.push(this.moveToAlgebraic(move, i));
    }

    // Add result
    moves.push(this.getPGNResult());

    return headers.join('\n') + '\n\n' + moves.join(' ');
  }

  /**
   * Gets the PGN result string
   */
  private getPGNResult(): string {
    switch (this._gameStatus) {
      case GameStatus.WHITE_WINS_CHECKMATE:
      case GameStatus.WHITE_WINS_RESIGNATION:
      case GameStatus.WHITE_WINS_TIMEOUT:
        return '1-0';
      case GameStatus.BLACK_WINS_CHECKMATE:
      case GameStatus.BLACK_WINS_RESIGNATION:
      case GameStatus.BLACK_WINS_TIMEOUT:
        return '0-1';
      case GameStatus.DRAW_STALEMATE:
      case GameStatus.DRAW_INSUFFICIENT_MATERIAL:
      case GameStatus.DRAW_THREEFOLD_REPETITION:
      case GameStatus.DRAW_FIFTY_MOVES:
      case GameStatus.DRAW_AGREEMENT:
        return '1/2-1/2';
      default:
        return '*';
    }
  }

  /**
   * Converts a move to algebraic notation
   */
  private moveToAlgebraic(move: Move, moveIndex: number): string {
    // Castling
    if (move.moveType === MoveType.CASTLING_KINGSIDE) {
      return move.isCheckmate ? 'O-O#' : move.isCheck ? 'O-O+' : 'O-O';
    }
    if (move.moveType === MoveType.CASTLING_QUEENSIDE) {
      return move.isCheckmate ? 'O-O-O#' : move.isCheck ? 'O-O-O+' : 'O-O-O';
    }

    let notation = '';

    // Piece letter (not for pawns)
    if (move.piece.type !== PieceType.PAWN) {
      notation += move.piece.type.toUpperCase();
    }

    // Disambiguation (if needed)
    const disambiguation = this.getDisambiguation(move, moveIndex);
    notation += disambiguation;

    // Capture
    if (move.captured || move.moveType === MoveType.EN_PASSANT) {
      if (move.piece.type === PieceType.PAWN) {
        notation += String.fromCharCode('a'.charCodeAt(0) + move.from.file);
      }
      notation += 'x';
    }

    // Destination square
    notation += String.fromCharCode('a'.charCodeAt(0) + move.to.file);
    notation += (move.to.rank + 1).toString();

    // Promotion
    if (move.moveType === MoveType.PROMOTION && move.promotion) {
      notation += '=' + move.promotion.toUpperCase();
    }

    // Check/Checkmate
    if (move.isCheckmate) {
      notation += '#';
    } else if (move.isCheck) {
      notation += '+';
    }

    return notation;
  }

  /**
   * Gets disambiguation string for a move (for algebraic notation)
   */
  private getDisambiguation(move: Move, moveIndex: number): string {
    if (move.piece.type === PieceType.PAWN || move.piece.type === PieceType.KING) {
      return '';
    }

    // Reconstruct board state before this move
    const tempGame = new ChessGame();
    tempGame.fromFEN(INITIAL_FEN);
    
    for (let i = 0; i < moveIndex; i++) {
      tempGame.makeMove(this._moveHistory[i]);
    }

    // Find all pieces of the same type that can move to the same square
    const pieces = tempGame.board.getPiecesByColor(move.piece.color);
    const samePieces = pieces.filter(
      (p) =>
        p.piece.type === move.piece.type &&
        (p.position.file !== move.from.file || p.position.rank !== move.from.rank)
    );

    const ambiguousPieces = samePieces.filter((p) => {
      const moves = getLegalMovesForPosition(
        tempGame.board,
        p.position,
        tempGame._enPassantTarget,
        tempGame._castlingRights
      );
      return moves.some(
        (m) => m.to.file === move.to.file && m.to.rank === move.to.rank
      );
    });

    if (ambiguousPieces.length === 0) {
      return '';
    }

    // Check if file is unique
    const sameFile = ambiguousPieces.some((p) => p.position.file === move.from.file);
    const sameRank = ambiguousPieces.some((p) => p.position.rank === move.from.rank);

    if (!sameFile) {
      return String.fromCharCode('a'.charCodeAt(0) + move.from.file);
    }
    if (!sameRank) {
      return (move.from.rank + 1).toString();
    }
    return String.fromCharCode('a'.charCodeAt(0) + move.from.file) + (move.from.rank + 1).toString();
  }

  /**
   * Imports a game from PGN notation
   */
  importPGN(pgn: string): void {
    // Reset the game
    this.reset();

    // Remove comments and variations
    let cleanPGN = pgn.replace(/\{[^}]*\}/g, ''); // Remove comments
    cleanPGN = cleanPGN.replace(/\([^)]*\)/g, ''); // Remove variations
    cleanPGN = cleanPGN.replace(/\[[^\]]*\]/g, ''); // Remove headers

    // Extract moves
    const moveRegex = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?|O-O-O|O-O)[+#]?/g;
    const moves = cleanPGN.match(moveRegex) || [];

    for (const moveStr of moves) {
      const move = this.parseAlgebraicMove(moveStr);
      if (move) {
        this.makeMove(move);
      }
    }
  }

  /**
   * Parses an algebraic notation move string
   */
  private parseAlgebraicMove(moveStr: string): Move | null {
    // Remove check/checkmate symbols
    const cleanMove = moveStr.replace(/[+#]/g, '');

    // Handle castling
    if (cleanMove === 'O-O' || cleanMove === '0-0') {
      const rank = this._currentTurn === PieceColor.WHITE ? 0 : 7;
      const kingPos: Position = { file: 4, rank };
      const moves = this.getLegalMoves(kingPos);
      return moves.find((m) => m.moveType === MoveType.CASTLING_KINGSIDE) || null;
    }
    if (cleanMove === 'O-O-O' || cleanMove === '0-0-0') {
      const rank = this._currentTurn === PieceColor.WHITE ? 0 : 7;
      const kingPos: Position = { file: 4, rank };
      const moves = this.getLegalMoves(kingPos);
      return moves.find((m) => m.moveType === MoveType.CASTLING_QUEENSIDE) || null;
    }

    // Parse the move
    let pieceType = PieceType.PAWN;
    let fromFile: number | null = null;
    let fromRank: number | null = null;
    let toFile: number;
    let toRank: number;
    let promotion: PieceType | undefined;

    let idx = 0;

    // Check for piece type
    if ('KQRBN'.includes(cleanMove[idx])) {
      pieceType = cleanMove[idx].toLowerCase() as PieceType;
      idx++;
    }

    // Check for disambiguation
    if (cleanMove[idx] >= 'a' && cleanMove[idx] <= 'h' && cleanMove[idx + 1] >= 'a' && cleanMove[idx + 1] <= 'h') {
      fromFile = cleanMove.charCodeAt(idx) - 'a'.charCodeAt(0);
      idx++;
    } else if (cleanMove[idx] >= '1' && cleanMove[idx] <= '8' && cleanMove[idx + 1] >= 'a' && cleanMove[idx + 1] <= 'h') {
      fromRank = parseInt(cleanMove[idx], 10) - 1;
      idx++;
    } else if (cleanMove[idx] >= 'a' && cleanMove[idx] <= 'h' && cleanMove[idx + 1] === 'x') {
      fromFile = cleanMove.charCodeAt(idx) - 'a'.charCodeAt(0);
      idx++;
    }

    // Skip capture symbol
    if (cleanMove[idx] === 'x') {
      idx++;
    }

    // Destination square
    toFile = cleanMove.charCodeAt(idx) - 'a'.charCodeAt(0);
    idx++;
    toRank = parseInt(cleanMove[idx], 10) - 1;
    idx++;

    // Check for promotion
    if (cleanMove[idx] === '=') {
      idx++;
      promotion = cleanMove[idx].toLowerCase() as PieceType;
    }

    // Find the piece that can make this move
    const pieces = this.board.getPiecesByColor(this._currentTurn);
    const matchingPieces = pieces.filter((p) => {
      if (p.piece.type !== pieceType) return false;
      if (fromFile !== null && p.position.file !== fromFile) return false;
      if (fromRank !== null && p.position.rank !== fromRank) return false;
      return true;
    });

    for (const { position } of matchingPieces) {
      const moves = this.getLegalMoves(position);
      const matchingMove = moves.find(
        (m) =>
          m.to.file === toFile &&
          m.to.rank === toRank &&
          (!promotion || m.promotion === promotion)
      );
      if (matchingMove) {
        return matchingMove;
      }
    }

    return null;
  }

  /**
   * Resigns the game for the current player
   */
  resign(): void {
    if (this._gameStatus !== GameStatus.IN_PROGRESS) {
      return;
    }

    this._gameStatus = this._currentTurn === PieceColor.WHITE
      ? GameStatus.BLACK_WINS_RESIGNATION
      : GameStatus.WHITE_WINS_RESIGNATION;
  }

  /**
   * Offers a draw (to be accepted by opponent)
   */
  offerDraw(): boolean {
    // This would typically involve network communication
    // For now, just return false (draw not accepted)
    return false;
  }

  /**
   * Accepts a draw offer
   */
  acceptDraw(): void {
    if (this._gameStatus !== GameStatus.IN_PROGRESS) {
      return;
    }

    this._gameStatus = GameStatus.DRAW_AGREEMENT;
  }

  /**
   * Gets the piece at a given position
   */
  getPieceAt(position: Position): Piece | null {
    return this.board.getPiece(position);
  }

  /**
   * Checks if the current player is in check
   */
  isCurrentPlayerInCheck(): boolean {
    return isInCheck(this.board, this._currentTurn);
  }

  /**
   * Gets all legal moves for the current player
   */
  getAllCurrentLegalMoves(): Move[] {
    return getAllLegalMoves(
      this.board,
      this._currentTurn,
      this._enPassantTarget,
      this._castlingRights
    );
  }
}