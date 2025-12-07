// ============================================
// Chess Types
// ============================================

/**
 * Chess piece types
 */
export enum PieceType {
  PAWN = 'p',
  KNIGHT = 'n',
  BISHOP = 'b',
  ROOK = 'r',
  QUEEN = 'q',
  KING = 'k',
}

/**
 * Piece colors
 */
export enum PieceColor {
  WHITE = 'w',
  BLACK = 'b',
}

/**
 * Represents a chess piece
 */
export interface Piece {
  type: PieceType;
  color: PieceColor;
}

/**
 * Board position (0-7 for both file and rank)
 */
export interface Position {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
}

/**
 * A square on the board - either contains a piece or is empty
 */
export type Square = Piece | null;

/**
 * Move types for special moves
 */
export enum MoveType {
  NORMAL = 'normal',
  CAPTURE = 'capture',
  EN_PASSANT = 'en_passant',
  CASTLING_KINGSIDE = 'castling_kingside',
  CASTLING_QUEENSIDE = 'castling_queenside',
  PROMOTION = 'promotion',
}

/**
 * Represents a chess move
 */
export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  moveType: MoveType;
  isCheck: boolean;
  isCheckmate: boolean;
}

/**
 * Game status enumeration
 */
export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  WHITE_WINS_CHECKMATE = 'white_wins_checkmate',
  BLACK_WINS_CHECKMATE = 'black_wins_checkmate',
  WHITE_WINS_RESIGNATION = 'white_wins_resignation',
  BLACK_WINS_RESIGNATION = 'black_wins_resignation',
  WHITE_WINS_TIMEOUT = 'white_wins_timeout',
  BLACK_WINS_TIMEOUT = 'black_wins_timeout',
  DRAW_STALEMATE = 'draw_stalemate',
  DRAW_INSUFFICIENT_MATERIAL = 'draw_insufficient_material',
  DRAW_THREEFOLD_REPETITION = 'draw_threefold_repetition',
  DRAW_FIFTY_MOVES = 'draw_fifty_moves',
  DRAW_AGREEMENT = 'draw_agreement',
}

/**
 * Castling rights for both players
 */
export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

/**
 * Complete game state
 */
export interface GameState {
  board: Square[][];
  currentTurn: PieceColor;
  castlingRights: CastlingRights;
  enPassantSquare: Position | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  moveHistory: Move[];
  positionHistory: string[]; // FEN strings for repetition detection
  status: GameStatus;
}

// ============================================
// Player & Room Types
// ============================================

/**
 * Player information
 */
export interface Player {
  id: string;
  name: string;
  color: PieceColor | null;
  isReady: boolean;
  isConnected: boolean;
}

/**
 * Time control settings
 */
export interface TimeControl {
  initial: number; // seconds
  increment: number; // seconds per move
}

/**
 * Game configuration
 */
export interface GameConfig {
  timeControl: TimeControl;
  hostColor: PieceColor | 'random';
}

/**
 * Room state enumeration
 */
export enum RoomState {
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

/**
 * Room information
 */
export interface Room {
  id: string;
  hostId: string;
  guestId?: string;
  createdAt: number;
  config: GameConfig;
  state: RoomState;
}

// ============================================
// Connection Types
// ============================================

/**
 * Connection status enumeration
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Connection state
 */
export interface ConnectionState {
  status: ConnectionStatus;
  peerId: string | null;
  roomId: string | null;
  opponentId: string | null;
  opponentName: string | null;
  latency: number;
  lastHeartbeat: number;
}

// ============================================
// Theme Types
// ============================================

/**
 * Available piece themes
 */
export enum PieceTheme {
  CLASSIC = 'classic',
  EGYPTIAN = 'egyptian',
  VIKING = 'viking',
  GREEK = 'greek',
}

/**
 * Piece assets mapping
 */
export interface PieceAssets {
  whiteKing: string;
  whiteQueen: string;
  whiteRook: string;
  whiteBishop: string;
  whiteKnight: string;
  whitePawn: string;
  blackKing: string;
  blackQueen: string;
  blackRook: string;
  blackBishop: string;
  blackKnight: string;
  blackPawn: string;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  id: PieceTheme;
  name: string;
  description: string;
  pieces: PieceAssets;
}