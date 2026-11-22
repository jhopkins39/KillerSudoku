import { Difficulty } from '../types/puzzle';
import { GeneratedPuzzle, layoutToCages } from './generator';

/**
 * Compact on-disk form of a puzzle: the cage layout as 81 base-62 characters
 * (one cage index per cell, row-major) and the solution as 81 digits. Cage
 * sums are derived from the two, so they can never disagree.
 */
export interface EncodedPuzzle {
  id: string;
  d: Difficulty;
  layout: string;
  solution: string;
}

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function encodePuzzle(p: GeneratedPuzzle): EncodedPuzzle {
  const layout = Array<string>(81);
  for (const cage of p.cages) {
    for (const [r, c] of cage.cells) layout[r * 9 + c] = ALPHABET[cage.id];
  }
  return {
    id: p.id,
    d: p.difficulty,
    layout: layout.join(''),
    solution: p.solution.flat().join(''),
  };
}

export function decodePuzzle(e: EncodedPuzzle): GeneratedPuzzle {
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => Number(e.solution[r * 9 + c])),
  );
  const layout = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => ALPHABET.indexOf(e.layout[r * 9 + c])),
  );
  return { id: e.id, difficulty: e.d, solution, cages: layoutToCages(layout, solution) };
}
