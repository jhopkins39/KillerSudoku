import { Puzzle } from '../types/puzzle';

export type Grid = (number | null)[][];
/** Notes per cell, stored as sorted digit arrays so state is serializable. */
export type Notes = number[][][];

export interface Snapshot {
  grid: Grid;
  notes: Notes;
}

export interface GameState extends Snapshot {
  undoStack: Snapshot[];
}

export const MAX_UNDO = 200;

export function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));
}

export function createEmptyNotes(): Notes {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]));
}

export function createGameState(): GameState {
  return { grid: createEmptyGrid(), notes: createEmptyNotes(), undoStack: [] };
}

export function hasProgress(state: Snapshot): boolean {
  return state.grid.some(row => row.some(v => v !== null)) || state.notes.some(row => row.some(n => n.length > 0));
}

/** Cells sharing a row, column, box or cage with (row, col), excluding itself. */
export function getPeers(puzzle: Puzzle, row: number, col: number): [number, number][] {
  const keys = new Set<string>();
  const out: [number, number][] = [];
  const add = (r: number, c: number) => {
    if (r === row && c === col) return;
    const k = `${r},${c}`;
    if (!keys.has(k)) {
      keys.add(k);
      out.push([r, c]);
    }
  };
  for (let i = 0; i < 9; i++) {
    add(row, i);
    add(i, col);
  }
  const br = row - (row % 3);
  const bc = col - (col % 3);
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) add(r, c);
  const cage = puzzle.cages.find(cg => cg.cells.some(([r, c]) => r === row && c === col));
  cage?.cells.forEach(([r, c]) => add(r, c));
  return out;
}

export type GameAction =
  | { type: 'setValue'; row: number; col: number; value: number | null; puzzle: Puzzle; autoClearNotes: boolean }
  | { type: 'toggleNote'; row: number; col: number; value: number }
  | { type: 'erase'; row: number; col: number }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'load'; state: GameState };

function withUndo(state: GameState, next: Snapshot): GameState {
  const undoStack = [...state.undoStack, { grid: state.grid, notes: state.notes }];
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  return { ...next, undoStack };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'setValue': {
      const { row, col, value, puzzle, autoClearNotes } = action;
      if (state.grid[row][col] === value) return state;
      const grid = state.grid.map(r => [...r]);
      grid[row][col] = value;
      let notes = state.notes;
      if (value !== null) {
        notes = state.notes.map(r => r.map(n => n));
        notes[row][col] = [];
        if (autoClearNotes) {
          for (const [r, c] of getPeers(puzzle, row, col)) {
            if (notes[r][c].includes(value)) notes[r][c] = notes[r][c].filter(n => n !== value);
          }
        }
      }
      return withUndo(state, { grid, notes });
    }
    case 'toggleNote': {
      const { row, col, value } = action;
      if (state.grid[row][col] !== null) return state;
      const notes = state.notes.map(r => r.map(n => n));
      const cell = notes[row][col];
      notes[row][col] = cell.includes(value) ? cell.filter(n => n !== value) : [...cell, value].sort();
      return withUndo(state, { grid: state.grid, notes });
    }
    case 'erase': {
      const { row, col } = action;
      if (state.grid[row][col] === null && state.notes[row][col].length === 0) return state;
      const grid = state.grid.map(r => [...r]);
      grid[row][col] = null;
      const notes = state.notes.map(r => r.map(n => n));
      notes[row][col] = [];
      return withUndo(state, { grid, notes });
    }
    case 'undo': {
      if (state.undoStack.length === 0) return state;
      const undoStack = state.undoStack.slice(0, -1);
      const prev = state.undoStack[state.undoStack.length - 1];
      return { ...prev, undoStack };
    }
    case 'reset': {
      if (!hasProgress(state)) return state;
      return withUndo(state, { grid: createEmptyGrid(), notes: createEmptyNotes() });
    }
    case 'load':
      return action.state;
  }
}
