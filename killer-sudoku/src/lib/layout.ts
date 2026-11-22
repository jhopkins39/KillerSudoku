import { Cage } from '../types/puzzle';

/** Converts a cage layout + solution into the Cage[] structure the app uses. */
export function layoutToCages(layout: number[][], solution: number[][]): Cage[] {
  const cages: Cage[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const id = layout[r][c];
      if (!cages[id]) cages[id] = { id, sum: 0, cells: [] };
      cages[id].cells.push([r, c]);
      cages[id].sum += solution[r][c];
    }
  }
  return cages;
}
