/**
 * UI Components Module
 *
 * This module contains all UI components for the chess game:
 * - Chess board component
 * - Piece renderer
 * - Promotion dialog
 * - Game screen
 * - Main menu
 * - Lobby
 * - Settings
 * - Toast notifications
 * - Move arrows
 * - Analysis panel
 * - Difficulty selector
 * - Game review
 */

// Board and piece rendering
export { Board } from './Board';
export { PieceRenderer } from './Piece';

// Dialogs
export { PromotionDialog, getPromotionDialog } from './PromotionDialog';
export { GameOverModal, getGameOverModal } from './GameOverModal';

// Screens
export { GameScreen } from './GameScreen';
export { MainMenu } from './MainMenu';
export type { GameMode } from './MainMenu';
export { Lobby } from './Lobby';
export { LandingPage } from './LandingPage';

// Settings
export { Settings, DEFAULT_SETTINGS } from './Settings';
export type { GameSettings } from './Settings';

// Notifications
export { Toast } from './Toast';
export type { ToastType, ToastOptions } from './Toast';

// New components for chess.com-like features
export { MoveArrows } from './MoveArrows';
export { AnalysisPanel } from './AnalysisPanel';
export { DifficultySelector, getDifficultyName, getDifficultyRating } from './DifficultySelector';
export { GameReview } from './GameReview';
export { Tutorial } from './Tutorial';

// Chat components
export { Chat } from './Chat';
export { GameChat } from './GameChat';