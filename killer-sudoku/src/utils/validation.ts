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

// Check cage constraints: no duplicates within cage, and sum matches when complete
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

    // Check sum if cage is complete
    if (!hasEmpty) {
      const sum = values.reduce((a, b) => a + b, 0);
      if (sum !== cage.sum) {
        cellKeys.forEach(key => conflicts.add(key));
      }
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
