/**
 * Piece Rendering Component
 * 
 * Handles rendering of chess pieces with support for multiple themes.
 */

import { Piece as PieceType, PieceColor, PieceTheme } from '../../types';

/**
 * Maps piece themes to their directory names
 */
const themeMap: Record<PieceTheme, string> = {
  [PieceTheme.CLASSIC]: 'classic',
  [PieceTheme.EGYPTIAN]: 'egyptian',
  [PieceTheme.VIKING]: 'viking',
  [PieceTheme.GREEK]: 'greek',
};

/**
 * Maps piece types to their file name parts
 */
const pieceTypeMap: Record<string, string> = {
  'p': 'pawn',
  'n': 'knight',
  'b': 'bishop',
  'r': 'rook',
  'q': 'queen',
  'k': 'king',
};

/**
 * Cache for preloaded images
 */
const imageCache: Map<string, HTMLImageElement> = new Map();

/**
 * PieceRenderer class for rendering chess pieces
 */
export class PieceRenderer {
  /**
   * Gets the image URL for a piece
   * @param piece The piece to get the image for
   * @param theme The theme to use
   * @returns The URL to the piece image
   */
  static getImageUrl(piece: PieceType, theme: PieceTheme): string {
    const themeName = themeMap[theme];
    const colorName = piece.color === PieceColor.WHITE ? 'white' : 'black';
    const pieceName = pieceTypeMap[piece.type];
    
    return `/pieces/${themeName}/${colorName}-${pieceName}.svg`;
  }

  /**
   * Creates a piece element (HTMLImageElement)
   * @param piece The piece to create an element for
   * @param theme The theme to use
   * @returns An HTMLImageElement for the piece
   */
  static createElement(piece: PieceType, theme: PieceTheme): HTMLImageElement {
    const url = this.getImageUrl(piece, theme);
    const cacheKey = url;
    
    // DEBUG: Log the URL being used
    console.log('[PieceRenderer] Creating piece element with URL:', url);
    
    // Check if we have a cached image
    const cachedImage = imageCache.get(cacheKey);
    if (cachedImage) {
      console.log('[PieceRenderer] Using cached image for:', url);
      const img = cachedImage.cloneNode(true) as HTMLImageElement;
      img.className = 'piece';
      img.draggable = false;
      return img;
    }
    
    // Create new image element
    const img = document.createElement('img');
    img.src = url;
    img.className = 'piece';
    img.alt = `${piece.color === PieceColor.WHITE ? 'White' : 'Black'} ${pieceTypeMap[piece.type]}`;
    img.draggable = false;
    
    // DEBUG: Add load/error handlers
    img.onload = () => console.log('[PieceRenderer] Image loaded successfully:', url);
    img.onerror = (e) => console.error('[PieceRenderer] Image failed to load:', url, e);
    
    // Add data attributes for piece info
    img.dataset.pieceType = piece.type;
    img.dataset.pieceColor = piece.color;
    
    return img;
  }

  /**
   * Preloads all piece images for a theme
   * @param theme The theme to preload
   * @returns A promise that resolves when all images are loaded
   */
  static preloadTheme(theme: PieceTheme): Promise<void> {
    const colors = [PieceColor.WHITE, PieceColor.BLACK];
    const pieceTypes = Object.keys(pieceTypeMap);
    
    const loadPromises: Promise<void>[] = [];
    
    for (const color of colors) {
      for (const type of pieceTypes) {
        const piece: PieceType = { type: type as PieceType['type'], color };
        const url = this.getImageUrl(piece, theme);
        
        // Skip if already cached
        if (imageCache.has(url)) {
          continue;
        }
        
        const promise = new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            imageCache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load piece image: ${url}`);
            resolve(); // Resolve anyway to not block other images
          };
          img.src = url;
        });
        
        loadPromises.push(promise);
      }
    }
    
    return Promise.all(loadPromises).then(() => {});
  }

  /**
   * Preloads all available themes
   * @returns A promise that resolves when all themes are loaded
   */
  static preloadAllThemes(): Promise<void> {
    const themes = Object.values(PieceTheme);
    return Promise.all(themes.map(theme => this.preloadTheme(theme))).then(() => {});
  }

  /**
   * Clears the image cache
   */
  static clearCache(): void {
    imageCache.clear();
  }

  /**
   * Gets the display name for a piece type
   * @param type The piece type
   * @returns The display name
   */
  static getPieceDisplayName(type: PieceType['type']): string {
    const names: Record<string, string> = {
      'p': 'Pawn',
      'n': 'Knight',
      'b': 'Bishop',
      'r': 'Rook',
      'q': 'Queen',
      'k': 'King',
    };
    return names[type] || 'Unknown';
  }

  /**
   * Gets the piece value for material calculation
   * @param type The piece type
   * @returns The piece value
   */
  static getPieceValue(type: PieceType['type']): number {
    const values: Record<string, number> = {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9,
      'k': 0, // King has no material value
    };
    return values[type] || 0;
  }
}