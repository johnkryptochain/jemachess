/**
 * Chess Engine Test
 * 
 * Simple smoke test to verify the chess engine works correctly.
 * Run with: npx ts-node src/engine/test.ts
 * Or import and call runTests() from the browser console.
 */

import { ChessGame } from './game';
import { PieceColor, PieceType, MoveType } from '../types';

/**
 * Test results interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * Run all chess engine tests
 */
export function runTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Initial position
  results.push(testInitialPosition());

  // Test 2: Legal moves for e2 pawn
  results.push(testPawnMoves());

  // Test 3: Make a move
  results.push(testMakeMove());

  // Test 4: FEN export/import
  results.push(testFEN());

  // Test 5: Castling
  results.push(testCastling());

  // Test 6: En passant
  results.push(testEnPassant());

  // Test 7: Checkmate detection
  results.push(testCheckmate());

  // Print results
  console.log('\n=== Chess Engine Test Results ===\n');
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}: ${result.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);

  return results;
}

/**
 * Test initial position setup
 */
function testInitialPosition(): TestResult {
  const game = new ChessGame();
  game.reset();

  const fen = game.toFEN();
  const expectedFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  if (fen === expectedFEN) {
    return { name: 'Initial position', passed: true };
  }

  return {
    name: 'Initial position',
    passed: false,
    message: `Expected ${expectedFEN}, got ${fen}`,
  };
}

/**
 * Test pawn moves from e2
 */
function testPawnMoves(): TestResult {
  const game = new ChessGame();
  game.reset();

  const moves = game.getLegalMoves({ file: 4, rank: 1 }); // e2 pawn

  // Should have 2 moves: e3 and e4
  if (moves.length === 2) {
    const hasE3 = moves.some(m => m.to.file === 4 && m.to.rank === 2);
    const hasE4 = moves.some(m => m.to.file === 4 && m.to.rank === 3);

    if (hasE3 && hasE4) {
      return { name: 'Pawn moves from e2', passed: true };
    }
  }

  return {
    name: 'Pawn moves from e2',
    passed: false,
    message: `Expected 2 moves (e3, e4), got ${moves.length} moves`,
  };
}

/**
 * Test making a move
 */
function testMakeMove(): TestResult {
  const game = new ChessGame();
  game.reset();

  // Make e2-e4
  const success = game.makeMove({
    from: { file: 4, rank: 1 },
    to: { file: 4, rank: 3 },
    piece: { type: PieceType.PAWN, color: PieceColor.WHITE },
    moveType: MoveType.NORMAL,
    isCheck: false,
    isCheckmate: false,
  });

  if (!success) {
    return {
      name: 'Make move e2-e4',
      passed: false,
      message: 'Move was rejected',
    };
  }

  // Check that it's now black's turn
  if (game.currentTurn !== PieceColor.BLACK) {
    return {
      name: 'Make move e2-e4',
      passed: false,
      message: 'Turn did not switch to black',
    };
  }

  // Check that the pawn is on e4
  const piece = game.getPieceAt({ file: 4, rank: 3 });
  if (!piece || piece.type !== PieceType.PAWN || piece.color !== PieceColor.WHITE) {
    return {
      name: 'Make move e2-e4',
      passed: false,
      message: 'Pawn not found on e4',
    };
  }

  return { name: 'Make move e2-e4', passed: true };
}

/**
 * Test FEN export and import
 */
function testFEN(): TestResult {
  const game = new ChessGame();
  
  // Set up a specific position
  const testFEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  
  try {
    game.fromFEN(testFEN);
    const exportedFEN = game.toFEN();

    if (exportedFEN === testFEN) {
      return { name: 'FEN export/import', passed: true };
    }

    return {
      name: 'FEN export/import',
      passed: false,
      message: `FEN mismatch: expected ${testFEN}, got ${exportedFEN}`,
    };
  } catch (error) {
    return {
      name: 'FEN export/import',
      passed: false,
      message: `Error: ${error}`,
    };
  }
}

/**
 * Test castling
 */
function testCastling(): TestResult {
  const game = new ChessGame();
  
  // Set up a position where white can castle kingside
  const castlingFEN = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
  game.fromFEN(castlingFEN);

  const kingMoves = game.getLegalMoves({ file: 4, rank: 0 }); // e1 king

  // Should include kingside castling (g1)
  const hasKingsideCastle = kingMoves.some(
    m => m.to.file === 6 && m.to.rank === 0 && m.moveType === MoveType.CASTLING_KINGSIDE
  );

  // Should include queenside castling (c1)
  const hasQueensideCastle = kingMoves.some(
    m => m.to.file === 2 && m.to.rank === 0 && m.moveType === MoveType.CASTLING_QUEENSIDE
  );

  if (hasKingsideCastle && hasQueensideCastle) {
    return { name: 'Castling detection', passed: true };
  }

  return {
    name: 'Castling detection',
    passed: false,
    message: `Kingside: ${hasKingsideCastle}, Queenside: ${hasQueensideCastle}`,
  };
}

/**
 * Test en passant
 */
function testEnPassant(): TestResult {
  const game = new ChessGame();
  
  // Set up a position where en passant is possible
  // White pawn on e5, black just played d7-d5
  const enPassantFEN = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
  game.fromFEN(enPassantFEN);

  const pawnMoves = game.getLegalMoves({ file: 4, rank: 4 }); // e5 pawn

  // Should include en passant capture on d6
  const hasEnPassant = pawnMoves.some(
    m => m.to.file === 3 && m.to.rank === 5 && m.moveType === MoveType.EN_PASSANT
  );

  if (hasEnPassant) {
    return { name: 'En passant detection', passed: true };
  }

  return {
    name: 'En passant detection',
    passed: false,
    message: 'En passant move not found',
  };
}

/**
 * Test checkmate detection
 */
function testCheckmate(): TestResult {
  const game = new ChessGame();
  
  // Set up fool's mate position (checkmate)
  const checkmateFEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
  game.fromFEN(checkmateFEN);

  if (game.isGameOver()) {
    return { name: 'Checkmate detection', passed: true };
  }

  return {
    name: 'Checkmate detection',
    passed: false,
    message: 'Checkmate not detected',
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runTests();
} else {
  // Browser environment - expose to window for console testing
  (window as any).runChessTests = runTests;
  console.log('Chess engine tests loaded. Run window.runChessTests() to execute.');
}