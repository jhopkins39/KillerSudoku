import { describe, expect, it } from 'vitest';
import { createGameState, gameReducer, GameState } from '../game';
import { samplePuzzle } from '../../data/samplePuzzle';

const set = (s: GameState, row: number, col: number, value: number | null, autoClearNotes = true) =>
  gameReducer(s, { type: 'setValue', row, col, value, puzzle: samplePuzzle, autoClearNotes });
const note = (s: GameState, row: number, col: number, value: number) =>
  gameReducer(s, { type: 'toggleNote', row, col, value });

describe('gameReducer', () => {
  it('places values and undoes them', () => {
    let s = set(createGameState(), 0, 0, 5);
    expect(s.grid[0][0]).toBe(5);
    s = gameReducer(s, { type: 'undo' });
    expect(s.grid[0][0]).toBeNull();
    expect(s.undoStack).toHaveLength(0);
  });

  it('toggles notes and clears the cell notes when a value is placed', () => {
    let s = note(createGameState(), 4, 4, 3);
    s = note(s, 4, 4, 7);
    expect(s.notes[4][4]).toEqual([3, 7]);
    s = note(s, 4, 4, 3);
    expect(s.notes[4][4]).toEqual([7]);
    s = set(s, 4, 4, 1);
    expect(s.notes[4][4]).toEqual([]);
  });

  it('auto-clears the placed digit from notes in the same row, column, box and cage', () => {
    let s = createGameState();
    s = note(s, 0, 8, 4); // same row
    s = note(s, 8, 0, 4); // same column
    s = note(s, 2, 2, 4); // same box
    s = note(s, 5, 5, 4); // unrelated
    s = note(s, 0, 8, 6); // other digit stays
    s = set(s, 0, 0, 4);
    expect(s.notes[0][8]).toEqual([6]);
    expect(s.notes[8][0]).toEqual([]);
    expect(s.notes[2][2]).toEqual([]);
    expect(s.notes[5][5]).toEqual([4]);
    // One undo restores all the cleared notes too.
    s = gameReducer(s, { type: 'undo' });
    expect(s.notes[8][0]).toEqual([4]);
  });

  it('leaves notes alone when auto-clear is off', () => {
    let s = note(createGameState(), 0, 8, 4);
    s = set(s, 0, 0, 4, false);
    expect(s.notes[0][8]).toEqual([4]);
  });

  it('reset clears the board but can be undone', () => {
    let s = set(createGameState(), 3, 3, 6);
    s = gameReducer(s, { type: 'reset' });
    expect(s.grid[3][3]).toBeNull();
    s = gameReducer(s, { type: 'undo' });
    expect(s.grid[3][3]).toBe(6);
  });

  it('ignores no-op moves so they do not fill the undo stack', () => {
    let s = set(createGameState(), 1, 1, 2);
    s = set(s, 1, 1, 2);
    s = gameReducer(s, { type: 'erase', row: 7, col: 7 });
    expect(s.undoStack).toHaveLength(1);
  });
});
