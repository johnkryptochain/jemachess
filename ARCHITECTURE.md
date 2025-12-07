# Chess Game Clone - Architecture Document

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Hierarchy](#component-hierarchy)
5. [Chess Engine Architecture](#chess-engine-architecture)
6. [Peer-to-Peer Networking](#peer-to-peer-networking)
7. [UI/UX Design System](#uiux-design-system)
8. [State Management](#state-management)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [API/Interface Definitions](#apiinterface-definitions)
11. [PWA Configuration](#pwa-configuration)
12. [Build and Deployment](#build-and-deployment)

---

## Project Overview

A peer-to-peer chess game web application featuring:
- Complete chess rules implementation with move validation
- WebRTC-based multiplayer without server-side database
- Progressive Web App optimized for ChromeOS
- Glassmorphism UI inspired by Apple Vision Pro
- Multiple piece theme modes (Classic, Egyptian, Sumerian, Greek)

### Primary Color Palette
- **Primary**: `#6b6fdb` (Soft Purple-Blue)
- **Primary Light**: `#8b8fe8`
- **Primary Dark**: `#4b4fbb`
- **Background**: `rgba(255, 255, 255, 0.1)` with backdrop blur
- **Surface**: `rgba(107, 111, 219, 0.15)`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `rgba(255, 255, 255, 0.7)`

---

## Technology Stack

### Core Technologies
| Technology | Purpose | Justification |
|------------|---------|---------------|
| **TypeScript** | Primary language | Type safety, better IDE support, reduced runtime errors |
| **Vite** | Build tool | Fast HMR, optimized builds, native ES modules |
| **Vanilla TS** | No framework | Minimal bundle size, full control, PWA optimization |
| **WebRTC** | P2P networking | Direct peer connections, no server required for gameplay |
| **Web Workers** | Chess engine | Non-blocking move calculations |

### Development Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **Workbox** | Service worker generation |

### External Services
| Service | Purpose |
|---------|---------|
| **PeerJS** | WebRTC signaling server (free tier) |
| **GitHub Pages** | Static hosting |

---

## Project Structure

```
chess-game/
├── public/
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   ├── splash/
│   │   └── splash-screen.png
│   ├── pieces/
│   │   ├── classic/
│   │   │   ├── white-king.svg
│   │   │   ├── white-queen.svg
│   │   │   ├── white-rook.svg
│   │   │   ├── white-bishop.svg
│   │   │   ├── white-knight.svg
│   │   │   ├── white-pawn.svg
│   │   │   ├── black-king.svg
│   │   │   ├── black-queen.svg
│   │   │   ├── black-rook.svg
│   │   │   ├── black-bishop.svg
│   │   │   ├── black-knight.svg
│   │   │   └── black-pawn.svg
│   │   ├── egyptian/
│   │   │   └── [same structure - Ra, Isis, Anubis, etc.]
│   │   ├── sumerian/
│   │   │   └── [same structure - Anu, Enlil, Enki, etc.]
│   │   └── greek/
│   │       └── [same structure - Zeus, Hera, Ares, etc.]
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── engine/
│   │   ├── board.ts
│   │   ├── piece.ts
│   │   ├── move.ts
│   │   ├── rules.ts
│   │   ├── validation.ts
│   │   ├── game-state.ts
│   │   └── engine.worker.ts
│   ├── network/
│   │   ├── peer-connection.ts
│   │   ├── signaling.ts
│   │   ├── room-manager.ts
│   │   ├── message-protocol.ts
│   │   └── connection-state.ts
│   ├── ui/
│   │   ├── components/
│   │   │   ├── board/
│   │   │   │   ├── chess-board.ts
│   │   │   │   ├── square.ts
│   │   │   │   └── piece-renderer.ts
│   │   │   ├── panels/
│   │   │   │   ├── game-info.ts
│   │   │   │   ├── move-history.ts
│   │   │   │   ├── captured-pieces.ts
│   │   │   │   └── timer.ts
│   │   │   ├── modals/
│   │   │   │   ├── modal-base.ts
│   │   │   │   ├── new-game-modal.ts
│   │   │   │   ├── join-game-modal.ts
│   │   │   │   ├── promotion-modal.ts
│   │   │   │   ├── game-over-modal.ts
│   │   │   │   └── settings-modal.ts
│   │   │   ├── controls/
│   │   │   │   ├── button.ts
│   │   │   │   ├── input.ts
│   │   │   │   ├── toggle.ts
│   │   │   │   └── dropdown.ts
│   │   │   └── layout/
│   │   │       ├── header.ts
│   │   │       ├── main-container.ts
│   │   │       └── footer.ts
│   │   ├── styles/
│   │   │   ├── variables.css
│   │   │   ├── reset.css
│   │   │   ├── glassmorphism.css
│   │   │   ├── animations.css
│   │   │   ├── board.css
│   │   │   ├── components.css
│   │   │   └── responsive.css
│   │   └── themes/
│   │       ├── theme-manager.ts
│   │       └── piece-themes.ts
│   ├── state/
│   │   ├── store.ts
│   │   ├── actions.ts
│   │   ├── reducers.ts
│   │   └── selectors.ts
│   ├── pwa/
│   │   ├── service-worker.ts
│   │   ├── install-prompt.ts
│   │   └── offline-handler.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── notation.ts
│   │   └── sound.ts
│   ├── types/
│   │   ├── chess.ts
│   │   ├── network.ts
│   │   ├── ui.ts
│   │   └── state.ts
│   ├── app.ts
│   └── main.ts
├── tests/
│   ├── unit/
│   │   ├── engine/
│   │   └── state/
│   └── e2e/
│       └── game-flow.spec.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

## Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── ThemeSelector
│   └── SettingsButton
├── MainContainer
│   ├── GameInfoPanel
│   │   ├── PlayerInfo (White)
│   │   ├── Timer (White)
│   │   ├── CapturedPieces (White)
│   │   └── ConnectionStatus
│   ├── ChessBoard
│   │   ├── Square[64]
│   │   │   └── Piece (optional)
│   │   ├── MoveHighlights
│   │   ├── CheckIndicator
│   │   └── DragOverlay
│   ├── GameInfoPanel
│   │   ├── PlayerInfo (Black)
│   │   ├── Timer (Black)
│   │   ├── CapturedPieces (Black)
│   │   └── MoveHistory
│   └── ControlPanel
│       ├── NewGameButton
│       ├── ResignButton
│       ├── DrawOfferButton
│       └── UndoRequestButton
├── ModalContainer
│   ├── NewGameModal
│   ├── JoinGameModal
│   ├── PromotionModal
│   ├── GameOverModal
│   └── SettingsModal
└── Footer
    ├── ConnectionInfo
    └── Version
```

---

## Chess Engine Architecture

### Core Data Structures

#### Board Representation
```typescript
// Bitboard representation for efficient move generation
type Bitboard = bigint;

interface BoardState {
  // Piece bitboards (12 total: 6 piece types × 2 colors)
  whitePawns: Bitboard;
  whiteKnights: Bitboard;
  whiteBishops: Bitboard;
  whiteRooks: Bitboard;
  whiteQueens: Bitboard;
  whiteKing: Bitboard;
  blackPawns: Bitboard;
  blackKnights: Bitboard;
  blackBishops: Bitboard;
  blackRooks: Bitboard;
  blackQueens: Bitboard;
  blackKing: Bitboard;
  
  // Aggregate bitboards
  whitePieces: Bitboard;
  blackPieces: Bitboard;
  allPieces: Bitboard;
}

// Alternative: 8x8 array for simpler operations
type Square = Piece | null;
type Board = Square[][];
```

#### Piece Definition
```typescript
enum PieceType {
  PAWN = 'p',
  KNIGHT = 'n',
  BISHOP = 'b',
  ROOK = 'r',
  QUEEN = 'q',
  KING = 'k'
}

enum Color {
  WHITE = 'w',
  BLACK = 'b'
}

interface Piece {
  type: PieceType;
  color: Color;
}
```

#### Move Representation
```typescript
interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isEnPassant: boolean;
  isCastling: 'kingside' | 'queenside' | false;
  isCheck: boolean;
  isCheckmate: boolean;
}

interface Position {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
}
```

#### Game State
```typescript
interface GameState {
  board: BoardState;
  currentTurn: Color;
  castlingRights: CastlingRights;
  enPassantSquare: Position | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  moveHistory: Move[];
  positionHistory: string[]; // FEN strings for repetition detection
  status: GameStatus;
}

interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

enum GameStatus {
  IN_PROGRESS = 'in_progress',
  WHITE_WINS_CHECKMATE = 'white_wins_checkmate',
  BLACK_WINS_CHECKMATE = 'black_wins_checkmate',
  WHITE_WINS_RESIGNATION = 'white_wins_resignation',
  BLACK_WINS_RESIGNATION = 'black_wins_resignation',
  DRAW_STALEMATE = 'draw_stalemate',
  DRAW_INSUFFICIENT_MATERIAL = 'draw_insufficient_material',
  DRAW_THREEFOLD_REPETITION = 'draw_threefold_repetition',
  DRAW_FIFTY_MOVES = 'draw_fifty_moves',
  DRAW_AGREEMENT = 'draw_agreement'
}
```

### Move Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Move Validation Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: (from: Position, to: Position)                          │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────┐                            │
│  │ 1. Basic Validation             │                            │
│  │    - Is there a piece at from?  │                            │
│  │    - Is it the current players? │                            │
│  │    - Is to within bounds?       │                            │
│  └─────────────────────────────────┘                            │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────┐                            │
│  │ 2. Piece Movement Rules         │                            │
│  │    - Can this piece type move   │                            │
│  │      from -> to?                │                            │
│  │    - Is path clear? (sliding)   │                            │
│  └─────────────────────────────────┘                            │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────┐                            │
│  │ 3. Special Move Detection       │                            │
│  │    - Castling validation        │                            │
│  │    - En passant validation      │                            │
│  │    - Pawn promotion detection   │                            │
│  └─────────────────────────────────┘                            │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────┐                            │
│  │ 4. King Safety Check            │                            │
│  │    - Apply move temporarily     │                            │
│  │    - Is own king in check?      │                            │
│  │    - Revert if invalid          │                            │
│  └─────────────────────────────────┘                            │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────┐                            │
│  │ 5. Result Calculation           │                            │
│  │    - Does move give check?      │                            │
│  │    - Is it checkmate?           │                            │
│  │    - Is it stalemate?           │                            │
│  └─────────────────────────────────┘                            │
│                    │                                             │
│                    ▼                                             │
│  Output: ValidatedMove | ValidationError                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Special Rules Implementation

#### Castling
```typescript
interface CastlingValidation {
  // Requirements:
  // 1. King and rook have not moved
  // 2. No pieces between king and rook
  // 3. King is not in check
  // 4. King does not pass through check
  // 5. King does not end in check
  
  canCastleKingside(state: GameState, color: Color): boolean;
  canCastleQueenside(state: GameState, color: Color): boolean;
}
```

#### En Passant
```typescript
interface EnPassantValidation {
  // Requirements:
  // 1. Enemy pawn just moved two squares
  // 2. Capturing pawn is on 5th rank (white) or 4th rank (black)
  // 3. Capturing pawn is adjacent to enemy pawn
  
  isEnPassantAvailable(state: GameState, from: Position): Position | null;
}
```

#### Pawn Promotion
```typescript
interface PromotionHandler {
  // Triggered when pawn reaches 8th rank (white) or 1st rank (black)
  // Player must choose: Queen, Rook, Bishop, or Knight
  
  requiresPromotion(move: Move): boolean;
  applyPromotion(move: Move, promoteTo: PieceType): Move;
}
```

---

## Peer-to-Peer Networking

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    P2P Connection Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Player A (Host)              Player B (Joiner)                 │
│       │                              │                           │
│       │  1. Create Room              │                           │
│       ├──────────────────►           │                           │
│       │  (Generate Room ID)          │                           │
│       │                              │                           │
│       │  2. Share Room ID            │                           │
│       │  ◄─────────────────────────► │                           │
│       │  (Out of band: copy/paste)   │                           │
│       │                              │                           │
│       │  3. Join Room                │                           │
│       │  ◄──────────────────────────┤                           │
│       │  (Connect via PeerJS)        │                           │
│       │                              │                           │
│       │  4. WebRTC Handshake         │                           │
│       │  ◄─────────────────────────► │                           │
│       │  (SDP Offer/Answer, ICE)     │                           │
│       │                              │                           │
│       │  5. Data Channel Open        │                           │
│       │  ◄═════════════════════════► │                           │
│       │  (Direct P2P Connection)     │                           │
│       │                              │                           │
│       │  6. Game Messages            │                           │
│       │  ◄═════════════════════════► │                           │
│       │  (Moves, State Sync, Chat)   │                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Message Protocol

```typescript
// Base message structure
interface GameMessage {
  type: MessageType;
  timestamp: number;
  senderId: string;
  payload: unknown;
}

enum MessageType {
  // Connection
  HANDSHAKE = 'handshake',
  HEARTBEAT = 'heartbeat',
  DISCONNECT = 'disconnect',
  
  // Game Setup
  GAME_CONFIG = 'game_config',
  PLAYER_READY = 'player_ready',
  GAME_START = 'game_start',
  
  // Gameplay
  MOVE = 'move',
  MOVE_ACK = 'move_ack',
  MOVE_REJECT = 'move_reject',
  
  // Game Control
  RESIGN = 'resign',
  DRAW_OFFER = 'draw_offer',
  DRAW_ACCEPT = 'draw_accept',
  DRAW_DECLINE = 'draw_decline',
  UNDO_REQUEST = 'undo_request',
  UNDO_ACCEPT = 'undo_accept',
  UNDO_DECLINE = 'undo_decline',
  
  // State Sync
  STATE_SYNC = 'state_sync',
  STATE_REQUEST = 'state_request',
  
  // Chat
  CHAT_MESSAGE = 'chat_message'
}

// Specific message payloads
interface HandshakePayload {
  playerName: string;
  clientVersion: string;
  preferredColor?: Color;
}

interface MovePayload {
  moveNumber: number;
  from: Position;
  to: Position;
  promotion?: PieceType;
  fen: string; // For verification
  timestamp: number;
}

interface StateSyncPayload {
  fen: string;
  moveHistory: string[]; // Algebraic notation
  whiteTime: number;
  blackTime: number;
  gameStatus: GameStatus;
}
```

### Connection State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                  Connection State Machine                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌──────────────┐                             │
│                    │ DISCONNECTED │                             │
│                    └──────┬───────┘                             │
│                           │                                      │
│                    create/join room                              │
│                           │                                      │
│                           ▼                                      │
│                    ┌──────────────┐                             │
│                    │  CONNECTING  │◄────────┐                   │
│                    └──────┬───────┘         │                   │
│                           │                 │                    │
│              ┌────────────┼────────────┐    │                   │
│              │            │            │    │                    │
│         timeout      connected      error   │                   │
│              │            │            │    │                    │
│              ▼            ▼            ▼    │                   │
│     ┌────────────┐ ┌──────────────┐ ┌──────┴─────┐             │
│     │  TIMEOUT   │ │  CONNECTED   │ │   ERROR    │             │
│     └─────┬──────┘ └──────┬───────┘ └──────┬─────┘             │
│           │               │                │                    │
│           │         peer disconnect        │                    │
│           │               │                │                    │
│           │               ▼                │                    │
│           │        ┌──────────────┐        │                    │
│           │        │ RECONNECTING │────────┤                    │
│           │        └──────┬───────┘        │                    │
│           │               │                │                    │
│           │          max retries           │                    │
│           │               │                │                    │
│           ▼               ▼                ▼                    │
│                    ┌──────────────┐                             │
│                    │ DISCONNECTED │                             │
│                    └──────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Room Management

```typescript
interface Room {
  id: string;           // 6-character alphanumeric
  hostId: string;       // PeerJS peer ID
  guestId?: string;     // PeerJS peer ID
  createdAt: number;
  config: GameConfig;
  state: RoomState;
}

interface GameConfig {
  timeControl: TimeControl;
  hostColor: Color | 'random';
  rated: boolean;
}

interface TimeControl {
  initial: number;      // seconds
  increment: number;    // seconds per move
}

enum RoomState {
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished'
}
```

---

## UI/UX Design System

### Glassmorphism Design Principles

```css
/* Core Glassmorphism Variables */
:root {
  /* Primary Colors */
  --color-primary: #6b6fdb;
  --color-primary-light: #8b8fe8;
  --color-primary-dark: #4b4fbb;
  --color-primary-rgb: 107, 111, 219;
  
  /* Glass Effect */
  --glass-background: rgba(255, 255, 255, 0.1);
  --glass-background-hover: rgba(255, 255, 255, 0.15);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --glass-blur: blur(20px);
  
  /* Surface Colors */
  --surface-primary: rgba(107, 111, 219, 0.15);
  --surface-secondary: rgba(107, 111, 219, 0.08);
  --surface-elevated: rgba(255, 255, 255, 0.12);
  
  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-tertiary: rgba(255, 255, 255, 0.5);
  
  /* Board Colors */
  --board-light: rgba(255, 255, 255, 0.9);
  --board-dark: rgba(107, 111, 219, 0.6);
  --board-highlight-move: rgba(107, 111, 219, 0.4);
  --board-highlight-check: rgba(255, 82, 82, 0.5);
  --board-highlight-last-move: rgba(107, 111, 219, 0.3);
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
}
```

### Component Styles

#### Glass Card
```css
.glass-card {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  transition: all var(--transition-normal);
}

.glass-card:hover {
  background: var(--glass-background-hover);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

#### Glass Button
```css
.glass-button {
  background: var(--surface-primary);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.glass-button:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  transform: scale(1.02);
}

.glass-button:active {
  transform: scale(0.98);
}

.glass-button--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
```

### Responsive Breakpoints

```css
/* Mobile First Approach */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

/* Board sizing */
.chess-board {
  --board-size: min(90vw, 90vh - 200px);
  width: var(--board-size);
  height: var(--board-size);
}

@media (min-width: 768px) {
  .chess-board {
    --board-size: min(60vw, 70vh);
  }
}

@media (min-width: 1024px) {
  .chess-board {
    --board-size: min(50vw, 80vh - 100px);
  }
}
```

### Piece Theme System

```typescript
interface PieceTheme {
  id: string;
  name: string;
  description: string;
  pieces: PieceAssets;
}

interface PieceAssets {
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

const PIECE_THEMES: PieceTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Staunton chess pieces',
    pieces: { /* SVG paths */ }
  },
  {
    id: 'egyptian',
    name: 'Egyptian Gods',
    description: 'Ancient Egyptian deity themed pieces',
    // King: Ra (Sun God)
    // Queen: Isis (Goddess of Magic)
    // Rook: Pyramid/Sphinx
    // Bishop: Anubis (God of Death)
    // Knight: Horus (Falcon God)
    // Pawn: Scarab Beetle
    pieces: { /* SVG paths */ }
  },
  {
    id: 'sumerian',
    name: 'Sumerian Gods',
    description: 'Ancient Mesopotamian deity themed pieces',
    // King: Anu (Sky God)
    // Queen: Inanna (Goddess of Love/War)
    // Rook: Ziggurat
    // Bishop: Enlil (God of Wind)
    // Knight: Lamassu (Winged Bull)
    // Pawn: Cuneiform Tablet
    pieces: { /* SVG paths */ }
  },
  {
    id: 'greek',
    name: 'Greek Gods',
    description: 'Olympian deity themed pieces',
    // King: Zeus (King of Gods)
    // Queen: Hera (Queen of Gods)
    // Rook: Greek Temple
    // Bishop: Apollo (God of Light)
    // Knight: Pegasus
    // Pawn: Spartan Shield
    pieces: { /* SVG paths */ }
  }
];
```

---

## State Management

### Store Architecture

```typescript
// Centralized state store using a simple pub/sub pattern
interface AppState {
  game: GameState;
  connection: ConnectionState;
  ui: UIState;
  settings: SettingsState;
}

interface ConnectionState {
  status: ConnectionStatus;
  peerId: string | null;
  roomId: string | null;
  opponentId: string | null;
  opponentName: string | null;
  latency: number;
  lastHeartbeat: number;
}

interface UIState {
  selectedSquare: Position | null;
  validMoves: Position[];
  isDragging: boolean;
  dragPiece: Piece | null;
  showPromotionModal: boolean;
  promotionSquare: Position | null;
  activeModal: ModalType | null;
  notifications: Notification[];
}

interface SettingsState {
  pieceTheme: string;
  boardTheme: string;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  showCoordinates: boolean;
  autoQueen: boolean;
  confirmMoves: boolean;
}
```

### Action Types

```typescript
type Action =
  // Game Actions
  | { type: 'GAME_INIT'; payload: GameConfig }
  | { type: 'GAME_MOVE'; payload: Move }
  | { type: 'GAME_UNDO'; payload: number }
  | { type: 'GAME_RESIGN'; payload: Color }
  | { type: 'GAME_DRAW'; payload: DrawReason }
  | { type: 'GAME_RESET' }
  
  // Connection Actions
  | { type: 'CONNECTION_CONNECTING'; payload: string }
  | { type: 'CONNECTION_CONNECTED'; payload: ConnectionInfo }
  | { type: 'CONNECTION_DISCONNECTED'; payload: DisconnectReason }
  | { type: 'CONNECTION_ERROR'; payload: Error }
  | { type: 'CONNECTION_LATENCY_UPDATE'; payload: number }
  
  // UI Actions
  | { type: 'UI_SELECT_SQUARE'; payload: Position | null }
  | { type: 'UI_SET_VALID_MOVES'; payload: Position[] }
  | { type: 'UI_START_DRAG'; payload: { piece: Piece; from: Position } }
  | { type: 'UI_END_DRAG' }
  | { type: 'UI_SHOW_MODAL'; payload: ModalType }
  | { type: 'UI_HIDE_MODAL' }
  | { type: 'UI_ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UI_REMOVE_NOTIFICATION'; payload: string }
  
  // Settings Actions
  | { type: 'SETTINGS_UPDATE'; payload: Partial<SettingsState> }
  | { type: 'SETTINGS_RESET' };
```

### Store Implementation

```typescript
class Store {
  private state: AppState;
  private listeners: Set<(state: AppState) => void>;
  private reducers: Map<string, Reducer>;

  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
    this.reducers = new Map();
  }

  getState(): AppState {
    return this.state;
  }

  dispatch(action: Action): void {
    const newState = this.reduce(this.state, action);
    if (newState !== this.state) {
      this.state = newState;
      this.notify();
    }
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private reduce(state: AppState, action: Action): AppState {
    return {
      game: gameReducer(state.game, action),
      connection: connectionReducer(state.connection, action),
      ui: uiReducer(state.ui, action),
      settings: settingsReducer(state.settings, action)
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

---

## Data Flow Diagrams

### Move Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Move Execution Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input                                                      │
│      │                                                           │
│      ▼                                                           │
│  ┌─────────────────┐                                            │
│  │ Click/Drag on   │                                            │
│  │ Chess Board     │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ UI Component    │────►│ Dispatch Action │                   │
│  │ Event Handler   │     │ UI_SELECT_SQUARE│                   │
│  └─────────────────┘     └────────┬────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌─────────────────┐                    │
│                          │ Store Reducer   │                    │
│                          │ Calculate Valid │                    │
│                          │ Moves           │                    │
│                          └────────┬────────┘                    │
│                                   │                              │
│           ┌───────────────────────┼───────────────────────┐     │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────┐ │
│  │ Highlight Valid │     │ User Selects    │     │ Invalid   │ │
│  │ Squares         │     │ Target Square   │     │ Selection │ │
│  └─────────────────┘     └────────┬────────┘     └───────────┘ │
│                                   │                              │
│                                   ▼                              │
│                          ┌─────────────────┐                    │
│                          │ Chess Engine    │                    │
│                          │ Validate Move   │                    │
│                          └────────┬────────┘                    │
│                                   │                              │
│           ┌───────────────────────┴───────────────────────┐     │
│           │                                               │     │
│           ▼                                               ▼     │
│  ┌─────────────────┐                             ┌─────────────┐│
│  │ Valid Move      │                             │ Invalid Move││
│  └────────┬────────┘                             └─────────────┘│
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Dispatch        │                                            │
│  │ GAME_MOVE       │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ├─────────────────────────────────────┐               │
│           │                                     │               │
│           ▼                                     ▼               │
│  ┌─────────────────┐                   ┌─────────────────┐     │
│  │ Update Local    │                   │ Send Move via   │     │
│  │ Game State      │                   │ WebRTC          │     │
│  └────────┬────────┘                   └────────┬────────┘     │
│           │                                     │               │
│           ▼                                     ▼               │
│  ┌─────────────────┐                   ┌─────────────────┐     │
│  │ Re-render       │                   │ Opponent        │     │
│  │ Board UI        │                   │ Receives Move   │     │
│  └─────────────────┘                   └─────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### P2P Game Synchronization

```
┌─────────────────────────────────────────────────────────────────┐
│                  P2P Game Synchronization                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Player A (Local)                    Player B (Remote)          │
│       │                                     │                    │
│       │  1. Make Move                       │                    │
│       ├────────────────────────────────────►│                    │
│       │     { type: MOVE, payload: {...} }  │                    │
│       │                                     │                    │
│       │  2. Validate Move                   │                    │
│       │                                     ├──┐                 │
│       │                                     │  │ Chess Engine   │
│       │                                     │◄─┘ Validation     │
│       │                                     │                    │
│       │  3a. Move Acknowledged              │                    │
│       │◄────────────────────────────────────┤                    │
│       │     { type: MOVE_ACK }              │                    │
│       │                                     │                    │
│       │  ─────── OR ───────                 │                    │
│       │                                     │                    │
│       │  3b. Move Rejected                  │                    │
│       │◄────────────────────────────────────┤                    │
│       │     { type: MOVE_REJECT,            │                    │
│       │       reason: "..." }               │                    │
│       │                                     │                    │
│       │  4. State Sync (periodic)           │                    │
│       │◄───────────────────────────────────►│                    │
│       │     { type: STATE_SYNC,             │                    │
│       │       fen: "...",                   │                    │
│       │       moveHistory: [...] }          │                    │
│       │                                     │                    │
│       │  5. Conflict Resolution             │                    │
│       │     (if states diverge)             │                    │
│       │◄───────────────────────────────────►│                    │
│       │     Compare move numbers            │                    │
│       │     Rollback to last sync           │                    │
│       │     Replay moves                    │                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API/Interface Definitions

### Chess Engine API

```typescript
interface ChessEngine {
  // Initialization
  newGame(): GameState;
  loadFEN(fen: string): GameState;
  loadPGN(pgn: string): GameState;
  
  // Move Operations
  getValidMoves(position: Position): Move[];
  getAllValidMoves(color: Color): Move[];
  makeMove(from: Position, to: Position, promotion?: PieceType): MoveResult;
  undoMove(): GameState;
  
  // Game State Queries
  isCheck(color: Color): boolean;
  isCheckmate(color: Color): boolean;
  isStalemate(): boolean;
  isDraw(): DrawReason | false;
  getGameStatus(): GameStatus;
  
  // Serialization
  toFEN(): string;
  toPGN(): string;
  getMoveHistory(): Move[];
  
  // Analysis
  getAttackedSquares(color: Color): Position[];
  getPieceAt(position: Position): Piece | null;
  getKingPosition(color: Color): Position;
}

interface MoveResult {
  success: boolean;
  move?: Move;
  error?: MoveError;
  newState: GameState;
}

enum MoveError {
  NO_PIECE = 'no_piece',
  WRONG_COLOR = 'wrong_color',
  INVALID_MOVE = 'invalid_move',
  KING_IN_CHECK = 'king_in_check',
  GAME_OVER = 'game_over'
}
```

### Network API

```typescript
interface NetworkManager {
  // Connection Management
  createRoom(config: GameConfig): Promise<Room>;
  joinRoom(roomId: string): Promise<Room>;
  leaveRoom(): void;
  
  // Messaging
  sendMove(move: Move): void;
  sendMessage(message: GameMessage): void;
  
  // Event Handlers
  onConnect(handler: (peerId: string) => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  onMessage(handler: (message: GameMessage) => void): void;
  onError(handler: (error: Error) => void): void;
  
  // State
  getConnectionState(): ConnectionState;
  getLatency(): number;
  isConnected(): boolean;
}

interface PeerConnection {
  // WebRTC Data Channel
  send(data: string | ArrayBuffer): void;
  close(): void;
  
  // Events
  onOpen: () => void;
  onClose: () => void;
  onMessage: (data: string | ArrayBuffer) => void;
  onError: (error: Error) => void;
}
```

### UI Component API

```typescript
interface ChessBoardComponent {
  // Rendering
  render(container: HTMLElement): void;
  update(state: GameState): void;
  
  // Interaction
  onSquareClick(handler: (position: Position) => void): void;
  onPieceDragStart(handler: (piece: Piece, from: Position) => void): void;
  onPieceDragEnd(handler: (to: Position) => void): void;
  
  // Visual State
  highlightSquares(positions: Position[], type: HighlightType): void;
  clearHighlights(): void;
  showMoveAnimation(from: Position, to: Position): Promise<void>;
  
  // Configuration
  setTheme(theme: PieceTheme): void;
  setOrientation(color: Color): void;
  setInteractive(enabled: boolean): void;
}

enum HighlightType {
  VALID_MOVE = 'valid_move',
  SELECTED = 'selected',
  LAST_MOVE = 'last_move',
  CHECK = 'check',
  PREMOVE = 'premove'
}
```

---

## PWA Configuration

### Web App Manifest

```json
{
  "name": "Chess Game",
  "short_name": "Chess",
  "description": "Peer-to-peer chess game with beautiful glassmorphism UI",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#1a1a2e",
  "theme_color": "#6b6fdb",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/game-wide.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/game-narrow.png",
      "sizes": "720x1280",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["games", "entertainment"],
  "prefer_related_applications": false
}
```

### Service Worker Strategy

```typescript
// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

// Service Worker Implementation
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache strategies
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);

// Offline fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10
      })
    ]
  })
);
```

### Installation Prompt Handler

```typescript
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class InstallPromptHandler {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled: boolean = false;

  constructor() {
    this.detectInstallation();
    this.setupEventListeners();
  }

  private detectInstallation(): void {
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
    
    // ChromeOS specific detection
    if (navigator.userAgent.includes('CrOS')) {
      // Additional ChromeOS-specific handling
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    
    return outcome === 'accepted';
  }

  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  private showInstallButton(): void {
    // Dispatch event to show install UI
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  private hideInstallButton(): void {
    // Dispatch event to hide install UI
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  }
}
```

---

## Build and Deployment

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'chess-engine': ['./src/engine/index.ts'],
          'network': ['./src/network/index.ts'],
          'ui': ['./src/ui/index.ts']
        }
      }
    }
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'pieces/**/*'],
      manifest: {
        name: 'Chess Game',
        short_name: 'Chess',
        theme_color: '#6b6fdb',
        background_color: '#1a1a2e',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*peerjs\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'peerjs-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],

  server: {
    port: 3000,
    host: true
  },

  preview: {
    port: 4173
  }
});
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@engine/*": ["./src/engine/*"],
      "@network/*": ["./src/network/*"],
      "@ui/*": ["./src/ui/*"],
      "@state/*": ["./src/state/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Package.json Scripts

```json
{
  "name": "chess-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts",
    "lint:fix": "eslint src --ext ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "prepare": "husky install"
  },
  "dependencies": {
    "peerjs": "^1.5.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.55.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.0",
    "terser": "^5.26.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.6",
    "vite-plugin-pwa": "^0.17.4",
    "vitest": "^1.0.4",
    "workbox-core": "^7.0.0",
    "workbox-expiration": "^7.0.0",
    "workbox-precaching": "^7.0.0",
    "workbox-routing": "^7.0.0",
    "workbox-strategies": "^7.0.0"
  }
}
```

### Deployment Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test -- --run

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3
```

---

## Appendix

### FEN Notation Reference

FEN (Forsyth-Edwards Notation) is used for serializing game state:

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
│                                            │ │    │ │ │
│                                            │ │    │ │ └─ Full move number
│                                            │ │    │ └─── Half move clock
│                                            │ │    └───── En passant square
│                                            │ └────────── Castling rights
│                                            └──────────── Active color
└───────────────────────────────────────────────────────── Board position
```

### Algebraic Notation Reference

Standard algebraic notation for moves:
- `e4` - Pawn to e4
- `Nf3` - Knight to f3
- `Bxc6` - Bishop captures on c6
- `O-O` - Kingside castling
- `O-O-O` - Queenside castling
- `e8=Q` - Pawn promotion to queen
- `Qh4+` - Queen to h4 with check
- `Qf7#` - Queen to f7 with checkmate

### Piece Theme Mapping

| Piece | Classic | Egyptian | Sumerian | Greek |
|-------|---------|----------|----------|-------|
| King | ♔/♚ | Ra | Anu | Zeus |
| Queen | ♕/♛ | Isis | Inanna | Hera |
| Rook | ♖/♜ | Pyramid | Ziggurat | Temple |
| Bishop | ♗/♝ | Anubis | Enlil | Apollo |
| Knight | ♘/♞ | Horus | Lamassu | Pegasus |
| Pawn | ♙/♟ | Scarab | Tablet | Shield |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-XX | Initial architecture document |

---

*This document serves as the technical blueprint for the Chess Game Clone project. All implementation should follow the patterns and structures defined herein.*