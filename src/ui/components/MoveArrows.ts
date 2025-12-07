/**
 * Move Arrows Component
 * 
 * Draws arrows on the chess board to show:
 * - Last move played
 * - Suggested/hint moves
 * - Analysis arrows
 */

import { Position } from '../../types';

/**
 * Arrow configuration
 */
interface ArrowConfig {
  color: string;
  opacity: number;
  width: number;
  headSize: number;
}

/**
 * Get responsive arrow scale based on viewport width
 * Returns a multiplier for arrow dimensions
 */
function getResponsiveArrowScale(): number {
  if (typeof window === 'undefined') return 1;
  
  const width = window.innerWidth;
  
  // Smartphone (< 480px): smaller arrows
  if (width < 480) return 0.6;
  
  // Small tablet / large phone (480-768px): medium-small arrows
  if (width < 768) return 0.75;
  
  // Tablet (768-1024px): medium arrows
  if (width < 1024) return 0.85;
  
  // Laptop/Desktop (>= 1024px): full size arrows
  return 1;
}

/**
 * Arrow types with their default configurations
 */
/**
 * Get computed CSS variable value
 */
function getCSSVariable(name: string, fallback: string): string {
  if (typeof document !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }
  return fallback;
}

/**
 * Get arrow configurations with theme-aware colors
 */
function getArrowConfigs(): Record<string, ArrowConfig> {
  // Get theme colors from CSS variables - consistent purple theme
  const primaryColor = getCSSVariable('--color-primary', '#7d82ea');
  const primaryLight = getCSSVariable('--color-primary-light', '#9a9ef0');
  
  return {
    lastMove: {
      color: primaryLight, // Use theme color for consistency
      opacity: 0.5,
      width: 8,
      headSize: 16,
    },
    suggestion: {
      color: primaryColor, // Use theme primary color (purple)
      opacity: 0.85,
      width: 10,
      headSize: 18,
    },
    analysis: {
      color: primaryLight, // Use lighter theme color for analysis
      opacity: 0.6,
      width: 8,
      headSize: 16,
    },
    threat: {
      color: '#c45c5c', // Muted red for threats
      opacity: 0.6,
      width: 8,
      headSize: 16,
    },
    custom: {
      color: primaryColor, // Use theme primary for custom arrows
      opacity: 0.5,
      width: 8,
      headSize: 16,
    },
  };
}

// Initialize with default values, will be updated when component is created
let ARROW_CONFIGS: Record<string, ArrowConfig> = getArrowConfigs();

/**
 * Arrow data structure
 */
interface Arrow {
  from: Position;
  to: Position;
  type: string;
  config: ArrowConfig;
}

/**
 * MoveArrows class for drawing arrows on the board
 */
export class MoveArrows {
  private container: HTMLElement;
  private svg: SVGElement | null = null;
  private arrows: Arrow[] = [];
  private squareSize: number = 0;
  private flipped: boolean = false;
  private boardElement: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    // Refresh arrow configs to get current theme colors
    ARROW_CONFIGS = getArrowConfigs();
    this.createSVG();
    this.setupResizeObserver();
  }

  /**
   * Create the SVG element for drawing arrows
   */
  private createSVG(): void {
    // Find the chess-board element inside the container
    this.boardElement = this.container.querySelector('.chess-board') as HTMLElement;
    const targetElement = this.boardElement || this.container;
    
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'move-arrows');
    this.svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    // Add arrow marker definitions
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Create markers for each arrow type
    for (const [type, config] of Object.entries(ARROW_CONFIGS)) {
      const marker = this.createArrowMarker(type, config);
      defs.appendChild(marker);
    }
    
    this.svg.appendChild(defs);
    
    // Append to the chess-board element if found, otherwise to container
    // The chess-board needs position: relative for this to work
    if (this.boardElement) {
      // Ensure the board has position relative
      const computedStyle = window.getComputedStyle(this.boardElement);
      if (computedStyle.position === 'static') {
        this.boardElement.style.position = 'relative';
      }
      this.boardElement.appendChild(this.svg);
    } else {
      this.container.appendChild(this.svg);
    }
    
    this.updateSquareSize();
  }

  /**
   * Create an arrow marker definition with responsive sizing
   */
  private createArrowMarker(id: string, config: ArrowConfig): SVGMarkerElement {
    // Get responsive scale for marker dimensions
    const scale = getResponsiveArrowScale();
    const markerSize = Math.round(10 * scale);
    const refX = Math.round(9 * scale);
    const refY = Math.round(5 * scale);
    
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `arrow-${id}`);
    marker.setAttribute('markerWidth', markerSize.toString());
    marker.setAttribute('markerHeight', markerSize.toString());
    marker.setAttribute('refX', refX.toString());
    marker.setAttribute('refY', refY.toString());
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    // Scale the path coordinates
    const pathSize = markerSize;
    const halfSize = pathSize / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M0,0 L0,${pathSize} L${pathSize},${halfSize} z`);
    path.setAttribute('fill', config.color);
    path.setAttribute('opacity', config.opacity.toString());

    marker.appendChild(path);
    return marker;
  }

  /**
   * Setup resize observer to update arrow positions
   */
  private setupResizeObserver(): void {
    const observer = new ResizeObserver(() => {
      this.updateSquareSize();
      this.redraw();
    });
    
    // Observe the chess-board element if available, otherwise the container
    const targetElement = this.boardElement || this.container;
    observer.observe(targetElement);
    
    // Also observe the container for fullscreen changes
    if (this.boardElement && this.boardElement !== this.container) {
      observer.observe(this.container);
    }
  }

  /**
   * Update the square size based on board dimensions
   */
  private updateSquareSize(): void {
    // Use the chess-board element dimensions if available
    const targetElement = this.boardElement || this.container;
    const rect = targetElement.getBoundingClientRect();
    this.squareSize = Math.min(rect.width, rect.height) / 8;
    
    // Update SVG viewBox to match the board size
    if (this.svg && rect.width > 0 && rect.height > 0) {
      const size = Math.min(rect.width, rect.height);
      this.svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      this.svg.style.width = `${size}px`;
      this.svg.style.height = `${size}px`;
    }
  }

  /**
   * Set whether the board is flipped
   */
  setFlipped(flipped: boolean): void {
    this.flipped = flipped;
    this.redraw();
  }

  /**
   * Convert board position to SVG coordinates
   */
  private positionToCoords(pos: Position): { x: number; y: number } {
    const file = this.flipped ? 7 - pos.file : pos.file;
    const rank = this.flipped ? pos.rank : 7 - pos.rank;
    
    return {
      x: (file + 0.5) * this.squareSize,
      y: (rank + 0.5) * this.squareSize,
    };
  }

  /**
   * Draw an arrow from one square to another
   */
  drawArrow(from: Position, to: Position, type: string = 'custom', customConfig?: Partial<ArrowConfig>): void {
    const config = { ...ARROW_CONFIGS[type] || ARROW_CONFIGS.custom, ...customConfig };
    
    this.arrows.push({ from, to, type, config });
    this.renderArrow({ from, to, type, config });
  }

  /**
   * Render a single arrow with responsive sizing
   */
  private renderArrow(arrow: Arrow): void {
    if (!this.svg) return;

    const fromCoords = this.positionToCoords(arrow.from);
    const toCoords = this.positionToCoords(arrow.to);

    // Get responsive scale for arrow dimensions
    const scale = getResponsiveArrowScale();

    // Calculate arrow direction and shorten it slightly
    const dx = toCoords.x - fromCoords.x;
    const dy = toCoords.y - fromCoords.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length;
    const unitY = dy / length;

    // Shorten arrow to not overlap with piece (scaled)
    const shortenStart = this.squareSize * 0.2 * scale;
    const shortenEnd = this.squareSize * 0.3 * scale;

    const startX = fromCoords.x + unitX * shortenStart;
    const startY = fromCoords.y + unitY * shortenStart;
    const endX = toCoords.x - unitX * shortenEnd;
    const endY = toCoords.y - unitY * shortenEnd;

    // Apply responsive scale to arrow width
    const scaledWidth = arrow.config.width * scale;

    // Create the arrow line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX.toString());
    line.setAttribute('y1', startY.toString());
    line.setAttribute('x2', endX.toString());
    line.setAttribute('y2', endY.toString());
    line.setAttribute('stroke', arrow.config.color);
    line.setAttribute('stroke-width', scaledWidth.toString());
    line.setAttribute('stroke-opacity', arrow.config.opacity.toString());
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', `url(#arrow-${arrow.type})`);
    line.setAttribute('class', `arrow arrow-${arrow.type}`);

    this.svg.appendChild(line);
  }

  /**
   * Show the last move arrow
   */
  showLastMove(from: Position, to: Position): void {
    // Remove existing last move arrow
    this.removeArrowsByType('lastMove');
    this.drawArrow(from, to, 'lastMove');
  }

  /**
   * Show a suggestion/hint arrow
   */
  showSuggestion(from: Position, to: Position): void {
    // Remove existing suggestion arrows
    this.removeArrowsByType('suggestion');
    this.drawArrow(from, to, 'suggestion');
  }

  /**
   * Show an analysis arrow
   */
  showAnalysis(from: Position, to: Position): void {
    this.drawArrow(from, to, 'analysis');
  }

  /**
   * Show a threat arrow
   */
  showThreat(from: Position, to: Position): void {
    this.drawArrow(from, to, 'threat');
  }

  /**
   * Remove arrows by type
   */
  removeArrowsByType(type: string): void {
    this.arrows = this.arrows.filter(a => a.type !== type);
    this.redraw();
  }

  /**
   * Clear all arrows
   */
  clear(): void {
    this.arrows = [];
    if (this.svg) {
      // Remove all arrow elements but keep defs
      const arrows = this.svg.querySelectorAll('.arrow');
      arrows.forEach(arrow => arrow.remove());
    }
  }

  /**
   * Clear all arrows except last move
   */
  clearExceptLastMove(): void {
    this.arrows = this.arrows.filter(a => a.type === 'lastMove');
    this.redraw();
  }

  /**
   * Redraw all arrows
   */
  private redraw(): void {
    if (!this.svg) return;

    // Remove all arrow elements
    const arrows = this.svg.querySelectorAll('.arrow');
    arrows.forEach(arrow => arrow.remove());

    // Redraw all arrows
    for (const arrow of this.arrows) {
      this.renderArrow(arrow);
    }
  }

  /**
   * Draw a circle highlight on a square
   */
  highlightSquare(pos: Position, color: string = '#ffcc00', opacity: number = 0.5): void {
    if (!this.svg) return;

    const coords = this.positionToCoords(pos);
    const radius = this.squareSize * 0.4;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coords.x.toString());
    circle.setAttribute('cy', coords.y.toString());
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('stroke-opacity', opacity.toString());
    circle.setAttribute('class', 'arrow highlight');

    this.svg.appendChild(circle);
  }

  /**
   * Draw a dot on a square (for legal move indicators)
   */
  drawDot(pos: Position, color: string = '#000000', opacity: number = 0.2): void {
    if (!this.svg) return;

    const coords = this.positionToCoords(pos);
    const radius = this.squareSize * 0.15;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coords.x.toString());
    circle.setAttribute('cy', coords.y.toString());
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', color);
    circle.setAttribute('fill-opacity', opacity.toString());
    circle.setAttribute('class', 'arrow dot');

    this.svg.appendChild(circle);
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
    this.arrows = [];
    this.boardElement = null;
  }
}