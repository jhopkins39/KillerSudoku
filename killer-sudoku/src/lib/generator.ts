import { Difficulty, Puzzle } from '../types/puzzle';
import { layoutToCages } from './layout';
import { hasUniqueSolution, solveKiller } from './solver';

/** Small, fast, seedable PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Builds a random complete, valid sudoku grid. */
export function randomSolvedGrid(rng: () => number): number[][] {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0) as number[]);

  const ok = (r: number, c: number, d: number) => {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === d || grid[i][c] === d) return false;
    }
    const br = r - (r % 3);
    const bc = c - (c % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[br + i][bc + j] === d) return false;
      }
    }
    return true;
  };

  const fill = (pos: number): boolean => {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (ok(r, c, d)) {
        grid[r][c] = d;
        if (fill(pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  };

  fill(0);
  return grid;
}

interface DifficultyProfile {
  /** Relative weights for cage sizes 1..6. */
  sizeWeights: number[];
  /** Search budget for the uniqueness check; harder puzzles get more. */
  maxNodes: number;
}

const PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: { sizeWeights: [3, 10, 6, 1, 0, 0], maxNodes: 200_000 },
  medium: { sizeWeights: [1, 6, 7, 4, 1, 0], maxNodes: 400_000 },
  hard: { sizeWeights: [0, 4, 7, 6, 3, 1], maxNodes: 800_000 },
};

function pickSize(weights: number[], rng: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i + 1;
  }
  return 1;
}

const NEIGHBORS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const n: number[] = [];
  if (r > 0) n.push(i - 9);
  if (r < 8) n.push(i + 9);
  if (c > 0) n.push(i - 1);
  if (c < 8) n.push(i + 1);
  return n;
});

/**
 * Randomly partitions the grid into connected cages whose digits never repeat.
 * Returns cage index per cell.
 */
function randomCageLayout(solution: number[][], profile: DifficultyProfile, rng: () => number): number[][] {
  const flat = solution.flat();
  const cageOf = new Array<number>(81).fill(-1);
  const cages: number[][] = [];

  const freeNeighbors = (i: number) => NEIGHBORS[i].filter(n => cageOf[n] === -1).length;

  while (true) {
    const unassigned = [];
    for (let i = 0; i < 81; i++) if (cageOf[i] === -1) unassigned.push(i);
    if (unassigned.length === 0) break;

    // Start from the most "boxed-in" cell so we don't strand singletons.
    shuffle(unassigned, rng);
    let start = unassigned[0];
    for (const i of unassigned) {
      if (freeNeighbors(i) < freeNeighbors(start)) start = i;
    }

    const target = pickSize(profile.sizeWeights, rng);
    const id = cages.length;
    const cells = [start];
    const digits = new Set([flat[start]]);
    cageOf[start] = id;

    while (cells.length < target) {
      const frontier: number[] = [];
      for (const cell of cells) {
        for (const n of NEIGHBORS[cell]) {
          if (cageOf[n] === -1 && !digits.has(flat[n]) && !frontier.includes(n)) frontier.push(n);
        }
      }
      if (frontier.length === 0) break;
      // Prefer cells that would otherwise become isolated.
      shuffle(frontier, rng);
      frontier.sort((a, b) => freeNeighbors(a) - freeNeighbors(b));
      const next = rng() < 0.6 ? frontier[0] : frontier[Math.floor(rng() * frontier.length)];
      cells.push(next);
      digits.add(flat[next]);
      cageOf[next] = id;
    }
    cages.push(cells);
  }

  // Merge unwanted singletons into a neighboring cage when the weights say
  // single-cell cages should be rare.
  const singleWeight = profile.sizeWeights[0] / profile.sizeWeights.reduce((a, b) => a + b, 0);
  const maxSize = profile.sizeWeights.length;
  for (let id = 0; id < cages.length; id++) {
    const cells = cages[id];
    if (cells.length !== 1 || rng() < singleWeight) continue;
    const cell = cells[0];
    const options = shuffle([...NEIGHBORS[cell]], rng)
      .map(n => cageOf[n])
      .filter(other => {
        const otherCells = cages[other];
        return (
          other !== id &&
          otherCells.length > 0 &&
          otherCells.length < maxSize &&
          !otherCells.some(c => flat[c] === flat[cell])
        );
      });
    if (options.length > 0) {
      const target = options[0];
      cages[target].push(cell);
      cageOf[cell] = target;
      cages[id] = [];
    }
  }

  return toGrid(renumber(cageOf));
}

function renumber(cageOf: number[]): number[] {
  const map = new Map<number, number>();
  return cageOf.map(id => {
    if (!map.has(id)) map.set(id, map.size);
    return map.get(id)!;
  });
}

function toGrid(cageOf: number[]): number[][] {
  return Array.from({ length: 9 }, (_, r) => cageOf.slice(r * 9, r * 9 + 9));
}

/**
 * Splits the cage containing `cell` into two connected pieces. Used when a
 * layout admits several solutions: smaller cages add information.
 */
function splitCage(layout: number[][], cell: number, rng: () => number): number[][] {
  const flatLayout = layout.flat();
  const id = flatLayout[cell];
  const members = flatLayout.map((v, i) => (v === id ? i : -1)).filter(i => i >= 0);
  if (members.length === 1) return layout;

  // Grow a connected piece from `cell` covering about half the cage, then
  // make sure the remainder is still connected; fall back to isolating `cell`.
  const targetSize = Math.max(1, Math.floor(members.length / 2));
  for (let attempt = 0; attempt < 8; attempt++) {
    const piece = new Set([cell]);
    while (piece.size < targetSize) {
      const frontier = [...piece].flatMap(p => NEIGHBORS[p]).filter(n => flatLayout[n] === id && !piece.has(n));
      if (frontier.length === 0) break;
      piece.add(frontier[Math.floor(rng() * frontier.length)]);
    }
    const rest = members.filter(m => !piece.has(m));
    if (isConnected(rest)) return applySplit(flatLayout, piece);
  }
  // Isolating a single cell can disconnect the rest; split the rest into its components.
  return applySplit(flatLayout, new Set([cell]));
}

function isConnected(cells: number[]): boolean {
  if (cells.length === 0) return true;
  const set = new Set(cells);
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of NEIGHBORS[cur]) {
      if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === cells.length;
}

function applySplit(flatLayout: number[], piece: Set<number>): number[][] {
  const next = [...flatLayout];
  const newId = Math.max(...next) + 1;
  for (const p of piece) next[p] = newId;
  // Relabel every connected component separately so cages stay contiguous.
  const relabeled = new Array<number>(81).fill(-1);
  let label = 0;
  for (let i = 0; i < 81; i++) {
    if (relabeled[i] !== -1) continue;
    const stack = [i];
    relabeled[i] = label;
    while (stack.length) {
      const cur = stack.pop()!;
      for (const n of NEIGHBORS[cur]) {
        if (relabeled[n] === -1 && next[n] === next[cur]) {
          relabeled[n] = label;
          stack.push(n);
        }
      }
    }
    label++;
  }
  return toGrid(relabeled);
}

export interface GeneratedPuzzle extends Puzzle {
  id: string;
  difficulty: Difficulty;
  solution: number[][];
}

/**
 * Generates a killer sudoku with exactly one solution. Deterministic for a
 * given seed, so puzzles can be referenced by `${difficulty}-${seed}`.
 */
export function generatePuzzle(difficulty: Difficulty, seed: number): GeneratedPuzzle {
  const rng = createRng(seed);
  const profile = PROFILES[difficulty];

  for (;;) {
    const solution = randomSolvedGrid(rng);
    let layout = randomCageLayout(solution, profile, rng);

    for (let refine = 0; refine < 30; refine++) {
      const cages = layoutToCages(layout, solution);
      const res = solveKiller(cages, { limit: 2, maxNodes: profile.maxNodes });
      if (res.aborted) break; // too slow to verify; start over with a new grid
      if (res.count === 1) {
        return { id: `${difficulty}-${seed}`, difficulty, cages, solution };
      }
      // Find a cell where two solutions disagree and split its cage.
      const [a, b] = res.solutions;
      const diffs: number[] = [];
      for (let i = 0; i < 81; i++) {
        if (a[Math.floor(i / 9)][i % 9] !== b[Math.floor(i / 9)][i % 9]) diffs.push(i);
      }
      layout = splitCage(layout, diffs[Math.floor(rng() * diffs.length)], rng);
    }
  }
}

export { hasUniqueSolution };
