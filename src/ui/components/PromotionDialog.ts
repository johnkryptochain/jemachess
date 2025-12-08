/**
 * Promotion Dialog Component
 * 
 * Shows a dialog for pawn promotion piece selection.
 */

import { PieceType, PieceColor, PieceTheme } from '../../types';
import { PieceRenderer } from './Piece';

/**
 * PromotionDialog class for handling pawn promotion selection
 */
export class PromotionDialog {
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private resolve: ((piece: PieceType) => void) | null = null;
  private reject: (() => void) | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Shows the promotion dialog and returns the selected piece
   * @param color The color of the promoting pawn
   * @param theme The piece theme to use
   * @param position The position to show the dialog (screen coordinates)
   * @param container Optional container element to append the dialog to (for fullscreen support)
   * @returns A promise that resolves with the selected piece type
   */
  show(
    color: PieceColor,
    theme: PieceTheme,
    position: { x: number; y: number },
    container?: HTMLElement
  ): Promise<PieceType> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      
      this.createDialog(color, theme, position, container);
      
      // Add keyboard listener
      document.addEventListener('keydown', this.handleKeyDown);
    });
  }

  /**
   * Hides the dialog
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.dialog = null;
      }, 200);
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Creates the dialog element
   */
  private createDialog(
    color: PieceColor,
    theme: PieceTheme,
    position: { x: number; y: number },
    container?: HTMLElement
  ): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.background = 'transparent';
    
    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'promotion-dialog';
    
    // Determine if dialog should appear above or below
    const viewportHeight = window.innerHeight;
    const isTop = position.y > viewportHeight / 2;
    this.dialog.classList.add(isTop ? 'bottom' : 'top');
    
    // Position the dialog
    this.dialog.style.position = 'fixed';
    this.dialog.style.left = `${position.x}px`;
    
    if (isTop) {
      this.dialog.style.bottom = `${viewportHeight - position.y}px`;
    } else {
      this.dialog.style.top = `${position.y}px`;
    }
    
    this.dialog.style.transform = 'translateX(-50%)';
    
    // Promotion piece options (Queen, Rook, Bishop, Knight)
    const promotionPieces: PieceType[] = [
      PieceType.QUEEN,
      PieceType.ROOK,
      PieceType.BISHOP,
      PieceType.KNIGHT,
    ];
    
    // Order based on dialog position
    const orderedPieces = isTop ? [...promotionPieces].reverse() : promotionPieces;
    
    for (const pieceType of orderedPieces) {
      const option = document.createElement('div');
      option.className = 'promotion-option';
      option.dataset.piece = pieceType;
      
      const piece = { type: pieceType, color };
      const pieceImg = PieceRenderer.createElement(piece, theme);
      option.appendChild(pieceImg);
      
      // Handle both click and touch events for mobile support
      const handleSelect = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectPiece(pieceType);
      };
      
      option.addEventListener('click', handleSelect);
      option.addEventListener('touchend', handleSelect);
      
      // Hover effect
      option.addEventListener('mouseenter', () => {
        option.style.background = 'rgba(107, 111, 219, 0.3)';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.background = '';
      });
      
      this.dialog.appendChild(option);
    }
    
    // Click/touch on overlay cancels (selects queen by default)
    const handleOverlayDismiss = (e: Event) => {
      if (e.target === this.overlay) {
        e.preventDefault();
        this.selectPiece(PieceType.QUEEN);
      }
    };
    
    this.overlay.addEventListener('click', handleOverlayDismiss);
    this.overlay.addEventListener('touchend', handleOverlayDismiss);
    
    this.overlay.appendChild(this.dialog);
    
    // Append to provided container (for fullscreen support) or document.body as fallback
    const targetContainer = container || document.body;
    targetContainer.appendChild(this.overlay);
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add('active');
    });
  }

  /**
   * Handles keyboard input
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'q':
        this.selectPiece(PieceType.QUEEN);
        break;
      case 'r':
        this.selectPiece(PieceType.ROOK);
        break;
      case 'b':
        this.selectPiece(PieceType.BISHOP);
        break;
      case 'n':
      case 'k': // Some people use 'k' for knight
        this.selectPiece(PieceType.KNIGHT);
        break;
      case 'escape':
        // Default to queen on escape
        this.selectPiece(PieceType.QUEEN);
        break;
    }
  }

  /**
   * Selects a piece and resolves the promise
   */
  private selectPiece(pieceType: PieceType): void {
    if (this.resolve) {
      this.resolve(pieceType);
      this.resolve = null;
      this.reject = null;
    }
    this.hide();
  }

  /**
   * Cancels the dialog
   */
  cancel(): void {
    if (this.reject) {
      this.reject();
      this.resolve = null;
      this.reject = null;
    }
    this.hide();
  }
}

/**
 * Singleton instance for easy access
 */
let promotionDialogInstance: PromotionDialog | null = null;

/**
 * Gets the singleton promotion dialog instance
 */
export function getPromotionDialog(): PromotionDialog {
  if (!promotionDialogInstance) {
    promotionDialogInstance = new PromotionDialog();
  }
  return promotionDialogInstance;
}