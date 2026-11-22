import library from '../data/puzzles.json';
import { samplePuzzle } from '../data/samplePuzzle';
import { Difficulty, Puzzle } from '../types/puzzle';
import { decodePuzzle, EncodedPuzzle } from './puzzleCodec';

const encoded = library as EncodedPuzzle[];

/** The original hand-entered puzzle, kept so games saved before the library existed still load. */
export const LEGACY_PUZZLE_ID = 'sample-puzzle-1';

const cache = new Map<string, Puzzle>();

export function getPuzzleById(id: string): Puzzle | null {
  if (cache.has(id)) return cache.get(id)!;
  let puzzle: Puzzle | null = null;
  if (id === LEGACY_PUZZLE_ID) {
    puzzle = { ...samplePuzzle, id: LEGACY_PUZZLE_ID, difficulty: 'medium' };
  } else {
    const e = encoded.find(p => p.id === id);
    if (e) puzzle = decodePuzzle(e);
  }
  if (puzzle) cache.set(id, puzzle);
  return puzzle;
}

export function puzzleIds(difficulty: Difficulty): string[] {
  return encoded.filter(p => p.d === difficulty).map(p => p.id);
}

/**
 * Picks a random puzzle of the given difficulty, avoiding ids in `played`
 * (most recent first). Once everything has been played, the puzzles played
 * longest ago become eligible again.
 */
export function pickPuzzleId(
  difficulty: Difficulty,
  played: string[],
  random: () => number = Math.random,
): string {
  const ids = puzzleIds(difficulty);
  const playedSet = new Set(played);
  let pool = ids.filter(id => !playedSet.has(id));
  if (pool.length === 0) {
    // Everything played: allow the older half of the history again.
    const recent = new Set(played.filter(id => ids.includes(id)).slice(0, Math.floor(ids.length / 2)));
    pool = ids.filter(id => !recent.has(id));
  }
  return pool[Math.floor(random() * pool.length)];
}
