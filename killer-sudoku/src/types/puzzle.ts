export interface Cage {
  id: number;
  sum: number;
  cells: [number, number][]; // [row, col] coordinates (0-indexed)
}

export interface Puzzle {
  cages: Cage[];
  solution?: number[][]; // Optional 9x9 solution grid
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellBorders {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}
