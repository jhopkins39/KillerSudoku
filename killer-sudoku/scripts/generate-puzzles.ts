/**
 * Regenerates src/data/puzzles.json, the bundled puzzle library.
 * Every puzzle is verified to have exactly one solution.
 *
 *   npm run puzzles            # default count per difficulty
 *   npm run puzzles -- 200     # custom count per difficulty
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generatePuzzle } from '../src/lib/generator';
import { encodePuzzle, EncodedPuzzle } from '../src/lib/puzzleCodec';
import { DIFFICULTIES } from '../src/types/puzzle';

const perDifficulty = Number(process.argv[2]) || 150;
const out: EncodedPuzzle[] = [];

for (const difficulty of DIFFICULTIES) {
  const start = Date.now();
  for (let seed = 1; seed <= perDifficulty; seed++) {
    out.push(encodePuzzle(generatePuzzle(difficulty, seed)));
  }
  console.log(`${difficulty}: ${perDifficulty} puzzles in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

const path = fileURLToPath(new URL('../src/data/puzzles.json', import.meta.url));
writeFileSync(path, JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`Wrote ${out.length} puzzles to ${path}`);
