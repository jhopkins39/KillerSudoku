import { Puzzle, CellBorders } from '../types/puzzle';

// Build a lookup map from cell coordinates to cage ID
export function buildCageMap(puzzle: Puzzle): Map<string, number> {
  const map = new Map<string, number>();
  for (const cage of puzzle.cages) {
    for (const [row, col] of cage.cells) {
      map.set(`${row},${col}`, cage.id);
    }
  }
  return map;
}

// Get the cage ID for a cell, or -1 if not found
export function getCageId(cageMap: Map<string, number>, row: number, col: number): number {
  return cageMap.get(`${row},${col}`) ?? -1;
}

// Determine which borders of a cell are cage boundaries
export function getCageBorders(
  cageMap: Map<string, number>,
  row: number,
  col: number
): CellBorders {
  const cageId = getCageId(cageMap, row, col);

  return {
    top: row === 0 || getCageId(cageMap, row - 1, col) !== cageId,
    right: col === 8 || getCageId(cageMap, row, col + 1) !== cageId,
    bottom: row === 8 || getCageId(cageMap, row + 1, col) !== cageId,
    left: col === 0 || getCageId(cageMap, row, col - 1) !== cageId,
  };
}

// Check if a cell is the "label" cell for its cage (top-left cell in the cage)
export function isCageLabelCell(puzzle: Puzzle, row: number, col: number): number | null {
  for (const cage of puzzle.cages) {
    // Find top-left cell: minimum row, then minimum col
    const sortedCells = [...cage.cells].sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      return a[1] - b[1];
    });
    const [labelRow, labelCol] = sortedCells[0];
    if (labelRow === row && labelCol === col) {
      return cage.sum;
    }
  }
  return null;
}

// Check for duplicate values in a row
export function getRowConflicts(grid: (number | null)[][], row: number): Set<number> {
  const seen = new Map<number, number[]>();
  const conflicts = new Set<number>();

  for (let col = 0; col < 9; col++) {
    const value = grid[row][col];
    if (value !== null) {
      if (!seen.has(value)) {
        seen.set(value, []);
      }
      seen.get(value)!.push(col);
    }
  }

  for (const [_, cols] of seen) {
    if (cols.length > 1) {
      cols.forEach(col => conflicts.add(col));
    }
  }

  return conflicts;
}

// Check for duplicate values in a column
export function getColConflicts(grid: (number | null)[][], col: number): Set<number> {
  const seen = new Map<number, number[]>();
  const conflicts = new Set<number>();

  for (let row = 0; row < 9; row++) {
    const value = grid[row][col];
    if (value !== null) {
      if (!seen.has(value)) {
        seen.set(value, []);
      }
      seen.get(value)!.push(row);
    }
  }

  for (const [_, rows] of seen) {
    if (rows.length > 1) {
      rows.forEach(row => conflicts.add(row));
    }
  }

  return conflicts;
}

// Check for duplicate values in a 3x3 box
export function getBoxConflicts(grid: (number | null)[][], boxRow: number, boxCol: number): Set<string> {
  const seen = new Map<number, string[]>();
  const conflicts = new Set<string>();

  const startRow = boxRow * 3;
  const startCol = boxCol * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const row = startRow + r;
      const col = startCol + c;
      const value = grid[row][col];
      if (value !== null) {
        const key = `${row},${col}`;
        if (!seen.has(value)) {
          seen.set(value, []);
        }
        seen.get(value)!.push(key);
      }
    }
  }

  for (const [_, cells] of seen) {
    if (cells.length > 1) {
      cells.forEach(cell => conflicts.add(cell));
    }
  }

  return conflicts;
}

// Get all cells with conflicts
export function getAllConflicts(grid: (number | null)[][]): Set<string> {
  const conflicts = new Set<string>();

  // Check rows
  for (let row = 0; row < 9; row++) {
    const rowConflicts = getRowConflicts(grid, row);
    rowConflicts.forEach(col => conflicts.add(`${row},${col}`));
  }

  // Check columns
  for (let col = 0; col < 9; col++) {
    const colConflicts = getColConflicts(grid, col);
    colConflicts.forEach(row => conflicts.add(`${row},${col}`));
  }

  // Check boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxConflicts = getBoxConflicts(grid, boxRow, boxCol);
      boxConflicts.forEach(cell => conflicts.add(cell));
    }
  }

  return conflicts;
}

// Check cage constraints: no duplicates within a cage, no partial sum over the
// target, and the exact sum once the cage is complete
export function getCageConflicts(grid: (number | null)[][], puzzle: Puzzle): Set<string> {
  const conflicts = new Set<string>();

  for (const cage of puzzle.cages) {
    const values: number[] = [];
    const cellKeys: string[] = [];
    let hasEmpty = false;

    for (const [row, col] of cage.cells) {
      const value = grid[row][col];
      cellKeys.push(`${row},${col}`);
      if (value !== null) {
        values.push(value);
      } else {
        hasEmpty = true;
      }
    }

    // Check for duplicates within cage
    const seen = new Set<number>();
    const duplicates = new Set<number>();
    for (const v of values) {
      if (seen.has(v)) {
        duplicates.add(v);
      }
      seen.add(v);
    }

    if (duplicates.size > 0) {
      // Mark all cells with duplicate values as conflicts
      for (let i = 0; i < cage.cells.length; i++) {
        const value = grid[cage.cells[i][0]][cage.cells[i][1]];
        if (value !== null && duplicates.has(value)) {
          conflicts.add(cellKeys[i]);
        }
      }
    }

    // Flag the cage if the digits so far already exceed the target, or if
    // it is complete with the wrong total.
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum > cage.sum || (!hasEmpty && sum !== cage.sum)) {
      cage.cells.forEach(([r, c], i) => {
        if (grid[r][c] !== null) conflicts.add(cellKeys[i]);
      });
    }
  }

  return conflicts;
}

// Check if the puzzle is solved correctly
export function isPuzzleSolved(grid: (number | null)[][], puzzle: Puzzle): boolean {
  // Check all cells are filled
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) return false;
    }
  }

  // Check no conflicts
  const conflicts = getAllConflicts(grid);
  if (conflicts.size > 0) return false;

  const cageConflicts = getCageConflicts(grid, puzzle);
  if (cageConflicts.size > 0) return false;

  return true;
}

/** Cage ids whose filled cells already exceed the target, or that are full with the wrong sum. */
export function getBadCages(grid: (number | null)[][], puzzle: Puzzle): Set<number> {
  const bad = new Set<number>();
  for (const cage of puzzle.cages) {
    let sum = 0;
    let full = true;
    for (const [r, c] of cage.cells) {
      const v = grid[r][c];
      if (v === null) full = false;
      else sum += v;
    }
    if (sum > cage.sum || (full && sum !== cage.sum)) bad.add(cage.id);
  }
  return bad;
}

/** A straight line segment in grid units (one cell = 1). */
export type Segment = [x1: number, y1: number, x2: number, y2: number];

/**
 * Computes the dashed outline of every cage, inset from the cell edges by
 * `inset` (in cell units). Ends are extended or shortened at corners so the
 * lines meet exactly, including at the inner corner of L-shaped cages.
 */
export function getCageOutlines(puzzle: Puzzle, inset = 0.08): Segment[] {
  const cageMap = buildCageMap(puzzle);
  const d = inset;
  const segments: Segment[] = [];

  for (const cage of puzzle.cages) {
    const id = cage.id;
    const inCage = (r: number, c: number) => getCageId(cageMap, r, c) === id;
    const horizontal: Segment[] = [];
    const vertical: Segment[] = [];

    for (const [r, c] of cage.cells) {
      // Where a horizontal edge ends at the left/right of this cell.
      const xStart = (rowDir: number) =>
        !inCage(r, c - 1) ? c + d : inCage(r + rowDir, c - 1) ? c - d : c;
      const xEnd = (rowDir: number) =>
        !inCage(r, c + 1) ? c + 1 - d : inCage(r + rowDir, c + 1) ? c + 1 + d : c + 1;
      // Where a vertical edge ends at the top/bottom of this cell.
      const yStart = (colDir: number) =>
        !inCage(r - 1, c) ? r + d : inCage(r - 1, c + colDir) ? r - d : r;
      const yEnd = (colDir: number) =>
        !inCage(r + 1, c) ? r + 1 - d : inCage(r + 1, c + colDir) ? r + 1 + d : r + 1;

      if (!inCage(r - 1, c)) horizontal.push([xStart(-1), r + d, xEnd(-1), r + d]);
      if (!inCage(r + 1, c)) horizontal.push([xStart(1), r + 1 - d, xEnd(1), r + 1 - d]);
      if (!inCage(r, c - 1)) vertical.push([c + d, yStart(-1), c + d, yEnd(-1)]);
      if (!inCage(r, c + 1)) vertical.push([c + 1 - d, yStart(1), c + 1 - d, yEnd(1)]);
    }

    segments.push(...mergeSegments(horizontal, true), ...mergeSegments(vertical, false));
  }

  return segments;
}

const EPS = 1e-9;

/** Joins collinear segments that touch so dash patterns run continuously. */
function mergeSegments(segs: Segment[], horizontal: boolean): Segment[] {
  const fixed = horizontal ? 1 : 0; // coordinate shared along the line
  const start = horizontal ? 0 : 1;
  const end = horizontal ? 2 : 3;
  const sorted = [...segs].sort((a, b) => a[fixed] - b[fixed] || a[start] - b[start]);
  const out: Segment[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[fixed] - s[fixed]) < EPS && Math.abs(last[end] - s[start]) < EPS) {
      last[end] = s[end];
    } else {
      out.push([...s] as Segment);
    }
  }
  return out;
}
