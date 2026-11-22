import { Cage } from '../types/puzzle';

/**
 * Fast killer sudoku solver used to verify that generated puzzles have
 * exactly one solution. Cells are indexed 0..80 (row * 9 + col) and digits
 * are stored as bitmasks (bit d-1 set means digit d).
 */

const ALL = 0x1ff;

const POPCOUNT = new Uint8Array(512);
const MASK_SUM = new Uint8Array(512);
for (let m = 0; m < 512; m++) {
  let count = 0;
  let sum = 0;
  for (let d = 0; d < 9; d++) {
    if (m & (1 << d)) {
      count++;
      sum += d + 1;
    }
  }
  POPCOUNT[m] = count;
  MASK_SUM[m] = sum;
}

/**
 * POSSIBLE[(k * 46 + s) * 512 + used] = mask of digits that can appear in a
 * set of k distinct digits, none of them in `used`, summing to s.
 */
const POSSIBLE = new Uint16Array(10 * 46 * 512);
for (let m = 1; m < 512; m++) {
  const k = POPCOUNT[m];
  const s = MASK_SUM[m];
  const base = (k * 46 + s) * 512;
  for (let used = 0; used < 512; used++) {
    if ((m & used) === 0) POSSIBLE[base + used] |= m;
  }
}

/** Digits that can still go in a cage with `remaining` empty cells needing `sumLeft`. */
export function cageCandidates(remaining: number, sumLeft: number, used: number): number {
  if (remaining <= 0 || sumLeft <= 0 || sumLeft > 45) return 0;
  return POSSIBLE[(remaining * 46 + sumLeft) * 512 + used];
}

const ROW_OF = new Uint8Array(81);
const COL_OF = new Uint8Array(81);
const BOX_OF = new Uint8Array(81);
for (let i = 0; i < 81; i++) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  ROW_OF[i] = r;
  COL_OF[i] = c;
  BOX_OF[i] = Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

function bitToDigit(bit: number): number {
  return 31 - Math.clz32(bit) + 1;
}

export interface SolveResult {
  /** Number of solutions found, capped at the requested limit. */
  count: number;
  /** The first solutions found (up to the limit), as 9x9 grids. */
  solutions: number[][][];
  /** True if the search gave up because it hit the node budget. */
  aborted: boolean;
}

export interface SolveOptions {
  /** Stop after finding this many solutions (default 2, enough to test uniqueness). */
  limit?: number;
  /** Give up after this many search nodes (default: unlimited). */
  maxNodes?: number;
  /** Optional givens (row-major, 0 = empty). */
  givens?: number[];
}

export function solveKiller(cages: Cage[], options: SolveOptions = {}): SolveResult {
  const limit = options.limit ?? 2;
  const maxNodes = options.maxNodes ?? Infinity;

  const cageOf = new Int16Array(81).fill(-1);
  const nCages = cages.length;
  const cageSumLeft = new Int16Array(nCages);
  const cageRemaining = new Int16Array(nCages);
  const cageUsed = new Uint16Array(nCages);

  cages.forEach((cage, ci) => {
    cageSumLeft[ci] = cage.sum;
    cageRemaining[ci] = cage.cells.length;
    for (const [r, c] of cage.cells) cageOf[r * 9 + c] = ci;
  });

  const rowUsed = new Uint16Array(9);
  const colUsed = new Uint16Array(9);
  const boxUsed = new Uint16Array(9);
  const grid = new Uint8Array(81);

  const result: SolveResult = { count: 0, solutions: [], aborted: false };

  const place = (i: number, bit: number, d: number) => {
    grid[i] = d;
    rowUsed[ROW_OF[i]] |= bit;
    colUsed[COL_OF[i]] |= bit;
    boxUsed[BOX_OF[i]] |= bit;
    const ci = cageOf[i];
    if (ci >= 0) {
      cageUsed[ci] |= bit;
      cageSumLeft[ci] -= d;
      cageRemaining[ci] -= 1;
    }
  };

  const unplace = (i: number, bit: number, d: number) => {
    grid[i] = 0;
    rowUsed[ROW_OF[i]] &= ~bit;
    colUsed[COL_OF[i]] &= ~bit;
    boxUsed[BOX_OF[i]] &= ~bit;
    const ci = cageOf[i];
    if (ci >= 0) {
      cageUsed[ci] &= ~bit;
      cageSumLeft[ci] += d;
      cageRemaining[ci] += 1;
    }
  };

  if (options.givens) {
    for (let i = 0; i < 81; i++) {
      const d = options.givens[i];
      if (d) {
        const bit = 1 << (d - 1);
        const ci = cageOf[i];
        if (
          (rowUsed[ROW_OF[i]] | colUsed[COL_OF[i]] | boxUsed[BOX_OF[i]]) & bit ||
          (ci >= 0 && cageUsed[ci] & bit)
        ) {
          return result; // contradictory givens
        }
        place(i, bit, d);
      }
    }
  }

  const candidates = (i: number): number => {
    let m = ALL & ~(rowUsed[ROW_OF[i]] | colUsed[COL_OF[i]] | boxUsed[BOX_OF[i]]);
    const ci = cageOf[i];
    if (ci >= 0) {
      m &= cageCandidates(cageRemaining[ci], cageSumLeft[ci], cageUsed[ci]);
    }
    return m;
  };

  let nodes = 0;

  const search = (): boolean => {
    if (++nodes > maxNodes) {
      result.aborted = true;
      return true;
    }

    // Pick the empty cell with the fewest candidates (MRV).
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const m = candidates(i);
      const n = POPCOUNT[m];
      if (n === 0) return false;
      if (n < bestCount) {
        best = i;
        bestMask = m;
        bestCount = n;
        if (n === 1) break;
      }
    }

    if (best === -1) {
      result.count++;
      const sol: number[][] = [];
      for (let r = 0; r < 9; r++) sol.push(Array.from(grid.subarray(r * 9, r * 9 + 9)));
      result.solutions.push(sol);
      return result.count >= limit;
    }

    let m = bestMask;
    while (m) {
      const bit = m & -m;
      m ^= bit;
      const d = bitToDigit(bit);
      place(best, bit, d);
      const stop = search();
      unplace(best, bit, d);
      if (stop) return true;
    }
    return false;
  };

  search();
  return result;
}

/** Returns true if the cages define exactly one solution. */
export function hasUniqueSolution(cages: Cage[], maxNodes?: number): boolean {
  const res = solveKiller(cages, { limit: 2, maxNodes });
  return !res.aborted && res.count === 1;
}
