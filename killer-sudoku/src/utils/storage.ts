import { Difficulty, DIFFICULTIES } from '../types/puzzle';
import { createGameState, GameState, Grid, hasProgress, Notes, Snapshot } from '../lib/game';
import { getPuzzleById, pickPuzzleId } from '../lib/puzzles';

// Types for stored data
export interface GameRecord {
  id: string;
  date: string;
  duration: number; // seconds
  completed: boolean;
  puzzleId: string;
  difficulty?: Difficulty;
}

export interface Settings {
  highlightConflicts: boolean;
  highlightSameNumbers: boolean;
  highlightRegion: boolean;
  autoClearNotes: boolean;
  showTimer: boolean;
  darkMode: boolean;
  lastDifficulty: Difficulty;
}

export interface SavedGameState {
  version: 2;
  puzzleId: string;
  difficulty: Difficulty;
  grid: Grid;
  notes: Notes;
  undoStack: Snapshot[];
  elapsedTime: number; // seconds played so far
  startedAt: string; // ISO date
}

const DEFAULT_SETTINGS: Settings = {
  highlightConflicts: true,
  highlightSameNumbers: true,
  highlightRegion: true,
  autoClearNotes: true,
  showTimer: true,
  darkMode: false,
  lastDifficulty: 'medium',
};

// Storage keys
const KEYS = {
  STATS: 'killerSudoku_stats', // legacy, stats are now derived from history
  HISTORY: 'killerSudoku_history',
  SETTINGS: 'killerSudoku_settings',
  SAVED_GAME: 'killerSudoku_savedGame',
};

function read<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (e) {
    console.error(`Failed to load ${key}:`, e);
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// ---------------------------------------------------------------------------
// History and stats
// ---------------------------------------------------------------------------

export function getHistory(): GameRecord[] {
  const data = read<GameRecord[]>(KEYS.HISTORY);
  return Array.isArray(data) ? data : [];
}

export function addToHistory(record: GameRecord): void {
  const history = getHistory();
  history.unshift(record); // newest first
  write(KEYS.HISTORY, history.slice(0, 5000));
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.STATS);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

export interface DifficultyStats {
  solved: number;
  bestTime: number | null;
  averageTime: number | null;
}

export interface GameStats {
  puzzlesSolved: number;
  puzzlesAbandoned: number;
  /** Every game ever begun: finished, abandoned, or in progress now. */
  puzzlesStarted: number;
  bestTime: number | null;
  averageTime: number | null;
  /** Solved / (solved + abandoned), or null before any game has finished. */
  winRate: number | null;
  byDifficulty: Record<Difficulty, DifficultyStats>;
}

function summarize(records: GameRecord[]): DifficultyStats {
  const times = records.filter(r => r.completed).map(r => r.duration);
  return {
    solved: times.length,
    bestTime: times.length ? Math.min(...times) : null,
    averageTime: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
  };
}

/** Stats are derived from history so they can never drift out of sync with it. */
export function computeStats(history: GameRecord[], gameInProgress: boolean): GameStats {
  const overall = summarize(history);
  const abandoned = history.filter(r => !r.completed).length;
  const finished = overall.solved + abandoned;
  const byDifficulty = Object.fromEntries(
    DIFFICULTIES.map(d => [d, summarize(history.filter(r => (r.difficulty ?? 'medium') === d))]),
  ) as Record<Difficulty, DifficultyStats>;
  return {
    puzzlesSolved: overall.solved,
    puzzlesAbandoned: abandoned,
    puzzlesStarted: history.length + (gameInProgress ? 1 : 0),
    bestTime: overall.bestTime,
    averageTime: overall.averageTime,
    winRate: finished > 0 ? Math.round((overall.solved / finished) * 100) : null,
    byDifficulty,
  };
}

export function getStats(): GameStats {
  const saved = getSavedGame();
  return computeStats(getHistory(), saved !== null && savedGameHasProgress(saved));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function getSettings(): Settings {
  const data = read<Partial<Settings>>(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}

export function saveSettings(settings: Settings): void {
  write(KEYS.SETTINGS, settings);
}

// ---------------------------------------------------------------------------
// Saved game
// ---------------------------------------------------------------------------

interface LegacySavedGame {
  grid: Grid;
  notes: number[][][];
  puzzleId: string;
  elapsedTime: number;
}

function isValidGrid(grid: unknown): grid is Grid {
  return Array.isArray(grid) && grid.length === 9 && grid.every(r => Array.isArray(r) && r.length === 9);
}

export function getSavedGame(): SavedGameState | null {
  const data = read<Partial<SavedGameState> & Partial<LegacySavedGame>>(KEYS.SAVED_GAME);
  if (!data || typeof data.puzzleId !== 'string' || !isValidGrid(data.grid)) return null;
  if (!getPuzzleById(data.puzzleId)) return null;

  const notes = isValidGrid(data.notes) && Array.isArray(data.notes[0][0])
    ? (data.notes as Notes)
    : createGameState().notes;

  return {
    version: 2,
    puzzleId: data.puzzleId,
    difficulty: data.difficulty ?? getPuzzleById(data.puzzleId)?.difficulty ?? 'medium',
    grid: data.grid,
    notes,
    undoStack: Array.isArray(data.undoStack) ? data.undoStack : [],
    elapsedTime: Math.max(0, Math.floor(data.elapsedTime ?? 0)),
    startedAt: data.startedAt ?? new Date().toISOString(),
  };
}

/** How many undo steps survive a reload (the in-memory stack is longer). */
const PERSISTED_UNDO = 50;

export function saveGame(state: SavedGameState): void {
  write(KEYS.SAVED_GAME, { ...state, undoStack: state.undoStack.slice(-PERSISTED_UNDO) });
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(KEYS.SAVED_GAME);
  } catch (e) {
    console.error('Failed to clear saved game:', e);
  }
}

export function savedGameHasProgress(saved: SavedGameState): boolean {
  return hasProgress(saved) || saved.undoStack.length > 0;
}

export function toGameState(saved: SavedGameState): GameState {
  return { grid: saved.grid, notes: saved.notes, undoStack: saved.undoStack };
}

/**
 * Starts a fresh puzzle of the given difficulty and saves it. If a game with
 * progress was in flight it is recorded in history as abandoned.
 */
export function startNewGame(difficulty: Difficulty, random: () => number = Math.random): SavedGameState {
  const previous = getSavedGame();
  if (previous && savedGameHasProgress(previous)) {
    addToHistory({
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      duration: previous.elapsedTime,
      completed: false,
      puzzleId: previous.puzzleId,
      difficulty: previous.difficulty,
    });
  }

  const played = getHistory().map(r => r.puzzleId);
  if (previous) played.unshift(previous.puzzleId);

  const game: SavedGameState = {
    version: 2,
    puzzleId: pickPuzzleId(difficulty, played, random),
    difficulty,
    ...createGameState(),
    elapsedTime: 0,
    startedAt: new Date().toISOString(),
  };
  saveGame(game);
  return game;
}

/** Returns the saved game, or starts a new one if there is none. */
export function loadOrStartGame(difficulty: Difficulty): SavedGameState {
  return getSavedGame() ?? startNewGame(difficulty);
}

/** Records a solved game in history and clears the saved game. */
export function recordWin(game: SavedGameState, duration: number): void {
  addToHistory({
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    duration,
    completed: true,
    puzzleId: game.puzzleId,
    difficulty: game.difficulty,
  });
  clearSavedGame();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const ss = secs.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}:${ss}` : `${mins}:${ss}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
