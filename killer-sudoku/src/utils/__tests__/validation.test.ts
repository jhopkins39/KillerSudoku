import { describe, expect, it } from 'vitest';
import { getBadCages, getCageConflicts, getCageOutlines, isPuzzleSolved } from '../validation';
import { createEmptyGrid } from '../../lib/game';
import { Puzzle } from '../../types/puzzle';
import library from '../../data/puzzles.json';
import { decodePuzzle, EncodedPuzzle } from '../../lib/puzzleCodec';

const lShape: Puzzle = {
  cages: [{ id: 0, sum: 6, cells: [[0, 0], [1, 0], [1, 1]] }],
};

describe('cage sum checks', () => {
  it('flags a partial cage whose digits already exceed the target', () => {
    const grid = createEmptyGrid();
    grid[0][0] = 4;
    grid[1][0] = 3; // 7 > 6 with one cell still empty
    expect(getBadCages(grid, lShape)).toEqual(new Set([0]));
    expect(getCageConflicts(grid, lShape)).toEqual(new Set(['0,0', '1,0']));
  });

  it('does not flag a partial cage that can still work', () => {
    const grid = createEmptyGrid();
    grid[0][0] = 1;
    grid[1][0] = 2;
    expect(getBadCages(grid, lShape).size).toBe(0);
    expect(getCageConflicts(grid, lShape).size).toBe(0);
  });

  it('flags a full cage with the wrong total', () => {
    const grid = createEmptyGrid();
    grid[0][0] = 1;
    grid[1][0] = 2;
    grid[1][1] = 4;
    expect(getBadCages(grid, lShape)).toEqual(new Set([0]));
  });
});

describe('isPuzzleSolved', () => {
  it('accepts the stored solution', () => {
    const p = decodePuzzle((library as EncodedPuzzle[])[0]);
    expect(isPuzzleSolved(p.solution, p)).toBe(true);
    const wrong = p.solution.map(r => [...r]);
    [wrong[0][0], wrong[0][1]] = [wrong[0][1], wrong[0][0]];
    expect(isPuzzleSolved(wrong, p)).toBe(false);
  });
});

/** Every outline must be a set of closed loops: each endpoint is shared by exactly two segments. */
function endpointsClosed(puzzle: Puzzle): boolean {
  const counts = new Map<string, number>();
  for (const [x1, y1, x2, y2] of getCageOutlines(puzzle)) {
    for (const k of [`${x1.toFixed(4)},${y1.toFixed(4)}`, `${x2.toFixed(4)},${y2.toFixed(4)}`]) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.values()].every(n => n === 2);
}

describe('getCageOutlines', () => {
  it('draws an L-shaped cage as one closed loop with no gap at the inner corner', () => {
    const segs = getCageOutlines(lShape, 0.1);
    expect(segs).toHaveLength(6); // an L has six sides
    expect(endpointsClosed(lShape)).toBe(true);
    // The inner (concave) corner pokes into the neighbouring cell's corner, at (1 - 0.1, 1 + 0.1).
    const hasInnerCorner = segs.some(
      ([x1, y1, x2, y2]) =>
        (Math.abs(x1 - 0.9) < 1e-9 && Math.abs(y1 - 1.1) < 1e-9) ||
        (Math.abs(x2 - 0.9) < 1e-9 && Math.abs(y2 - 1.1) < 1e-9),
    );
    expect(hasInnerCorner).toBe(true);
  });

  it('produces closed outlines for every bundled puzzle', () => {
    for (const e of (library as EncodedPuzzle[]).slice(0, 60)) {
      expect(endpointsClosed(decodePuzzle(e)), e.id).toBe(true);
    }
  });
});
