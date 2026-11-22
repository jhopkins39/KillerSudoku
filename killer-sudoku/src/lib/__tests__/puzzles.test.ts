import { describe, expect, it } from 'vitest';
import library from '../../data/puzzles.json';
import { samplePuzzle } from '../../data/samplePuzzle';
import { generatePuzzle } from '../generator';
import { decodePuzzle, encodePuzzle, EncodedPuzzle } from '../puzzleCodec';
import { cageCandidates, hasUniqueSolution, solveKiller } from '../solver';
import { Cage } from '../../types/puzzle';

const puzzles = (library as EncodedPuzzle[]).map(decodePuzzle);

function isValidSudoku(grid: number[][]): boolean {
  const units: number[][] = [];
  for (let i = 0; i < 9; i++) {
    units.push(grid[i]);
    units.push(grid.map(row => row[i]));
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    units.push([0, 1, 2].flatMap(r => [0, 1, 2].map(c => grid[br + r][bc + c])));
  }
  return units.every(u => [...u].sort().join('') === '123456789');
}

function isContiguous(cage: Cage): boolean {
  const keys = new Set(cage.cells.map(([r, c]) => `${r},${c}`));
  const seen = new Set([`${cage.cells[0][0]},${cage.cells[0][1]}`]);
  const stack = [cage.cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${r + dr},${c + dc}`;
      if (keys.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([r + dr, c + dc]);
      }
    }
  }
  return seen.size === keys.size;
}

describe('cageCandidates', () => {
  it('knows the only ways to make small sums', () => {
    // 2 cells summing to 3 must be {1,2}
    expect(cageCandidates(2, 3, 0)).toBe(0b11);
    // 2 cells summing to 17 must be {8,9}
    expect(cageCandidates(2, 17, 0)).toBe(0b110000000);
    // 1 cell summing to 5 with 5 already used in the cage is impossible
    expect(cageCandidates(1, 5, 1 << 4)).toBe(0);
  });
});

describe('solver', () => {
  it('solves the original sample puzzle uniquely', () => {
    const res = solveKiller(samplePuzzle.cages, { limit: 2 });
    expect(res.count).toBe(1);
    expect(isValidSudoku(res.solutions[0])).toBe(true);
  });

  it('detects multiple solutions', () => {
    // A single 81-cell "cage" is just an empty sudoku: many solutions.
    const cells: [number, number][] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
    // Split into rows so cage digits stay distinct.
    const cages: Cage[] = Array.from({ length: 9 }, (_, r) => ({
      id: r,
      sum: 45,
      cells: cells.filter(([row]) => row === r),
    }));
    expect(hasUniqueSolution(cages)).toBe(false);
  });
});

describe('generator', () => {
  it('is deterministic for a seed', () => {
    const a = generatePuzzle('easy', 42);
    const b = generatePuzzle('easy', 42);
    expect(a).toEqual(b);
  });

  it('round-trips through the codec', () => {
    const p = generatePuzzle('medium', 7);
    expect(decodePuzzle(encodePuzzle(p))).toEqual(p);
  });
});

describe('bundled puzzle library', () => {
  it('has plenty of puzzles for every difficulty with unique ids', () => {
    const ids = new Set(puzzles.map(p => p.id));
    expect(ids.size).toBe(puzzles.length);
    for (const d of ['easy', 'medium', 'hard']) {
      expect(puzzles.filter(p => p.difficulty === d).length).toBeGreaterThanOrEqual(100);
    }
  });

  it('every puzzle is well formed', () => {
    for (const p of puzzles) {
      expect(isValidSudoku(p.solution), p.id).toBe(true);
      const covered = new Set<string>();
      for (const cage of p.cages) {
        expect(isContiguous(cage), `${p.id} cage ${cage.id}`).toBe(true);
        const digits = cage.cells.map(([r, c]) => p.solution[r][c]);
        expect(new Set(digits).size, `${p.id} cage ${cage.id} repeats a digit`).toBe(digits.length);
        expect(digits.reduce((a, b) => a + b, 0)).toBe(cage.sum);
        cage.cells.forEach(([r, c]) => covered.add(`${r},${c}`));
      }
      expect(covered.size).toBe(81);
    }
  });

  it('every puzzle has exactly one solution, matching the stored one', () => {
    for (const p of puzzles) {
      const res = solveKiller(p.cages, { limit: 2 });
      expect(res.count, p.id).toBe(1);
      expect(res.solutions[0], p.id).toEqual(p.solution);
    }
  }, 120_000);
});
