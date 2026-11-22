import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToHistory,
  computeStats,
  formatTime,
  getHistory,
  getSavedGame,
  getStats,
  recordWin,
  saveGame,
  startNewGame,
} from '../storage';

beforeEach(() => localStorage.clear());

describe('starting and finishing games', () => {
  it('starts a new puzzle of the chosen difficulty without touching history', () => {
    const game = startNewGame('hard');
    expect(game.puzzleId).toMatch(/^hard-/);
    expect(getSavedGame()?.puzzleId).toBe(game.puzzleId);
    expect(getHistory()).toHaveLength(0);
  });

  it('records an in-progress game as abandoned when a new one starts', () => {
    const game = startNewGame('easy');
    game.grid[0][0] = 5;
    game.elapsedTime = 42;
    saveGame(game);
    const next = startNewGame('easy');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ completed: false, duration: 42, puzzleId: game.puzzleId });
    expect(next.puzzleId).not.toBe(game.puzzleId);
  });

  it('does not count an untouched game as abandoned', () => {
    startNewGame('easy');
    startNewGame('medium');
    expect(getHistory()).toHaveLength(0);
  });

  it('records a win and clears the saved game', () => {
    const game = startNewGame('medium');
    recordWin(game, 300);
    expect(getSavedGame()).toBeNull();
    expect(getStats()).toMatchObject({ puzzlesSolved: 1, puzzlesStarted: 1, bestTime: 300, winRate: 100 });
  });

  it('avoids puzzles that were already played', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const g = startNewGame('easy');
      expect(seen.has(g.puzzleId)).toBe(false);
      seen.add(g.puzzleId);
      recordWin(g, 100);
    }
  });

  it('loads games saved by the previous version of the app', () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(null));
    grid[0][0] = 2;
    localStorage.setItem(
      'killerSudoku_savedGame',
      JSON.stringify({
        grid,
        notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
        puzzleId: 'sample-puzzle-1',
        startTime: 0,
        elapsedTime: 77,
      }),
    );
    const saved = getSavedGame();
    expect(saved).toMatchObject({ puzzleId: 'sample-puzzle-1', elapsedTime: 77, undoStack: [] });
    expect(saved?.grid[0][0]).toBe(2);
  });
});

describe('computeStats', () => {
  it('derives totals, per-difficulty times and win rate from history', () => {
    const base = { date: new Date().toISOString() };
    addToHistory({ ...base, id: '1', duration: 600, completed: true, puzzleId: 'easy-1', difficulty: 'easy' });
    addToHistory({ ...base, id: '2', duration: 400, completed: true, puzzleId: 'easy-2', difficulty: 'easy' });
    addToHistory({ ...base, id: '3', duration: 50, completed: false, puzzleId: 'hard-1', difficulty: 'hard' });
    const stats = computeStats(getHistory(), true);
    expect(stats.puzzlesSolved).toBe(2);
    expect(stats.puzzlesAbandoned).toBe(1);
    expect(stats.puzzlesStarted).toBe(4);
    expect(stats.winRate).toBe(67);
    expect(stats.bestTime).toBe(400);
    expect(stats.byDifficulty.easy).toEqual({ solved: 2, bestTime: 400, averageTime: 500 });
    expect(stats.byDifficulty.hard.solved).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});
