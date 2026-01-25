// Types for stored data
export interface GameRecord {
  id: string;
  date: string;
  duration: number; // seconds
  completed: boolean;
  puzzleId: string;
}

export interface GameStats {
  puzzlesSolved: number;
  puzzlesStarted: number;
  bestTime: number | null; // seconds
  totalTime: number; // seconds (for calculating average)
}

export interface Settings {
  highlightConflicts: boolean;
  highlightSameNumbers: boolean;
  showTimer: boolean;
  darkMode: boolean;
}

export interface SavedGameState {
  grid: (number | null)[][];
  notes: number[][]; // Store as arrays since Set can't be serialized
  puzzleId: string;
  startTime: number; // timestamp
  elapsedTime: number; // seconds (accumulated before current session)
}

// Default values
const DEFAULT_STATS: GameStats = {
  puzzlesSolved: 0,
  puzzlesStarted: 0,
  bestTime: null,
  totalTime: 0,
};

const DEFAULT_SETTINGS: Settings = {
  highlightConflicts: true,
  highlightSameNumbers: true,
  showTimer: true,
  darkMode: false,
};

// Storage keys
const KEYS = {
  STATS: 'killerSudoku_stats',
  HISTORY: 'killerSudoku_history',
  SETTINGS: 'killerSudoku_settings',
  SAVED_GAME: 'killerSudoku_savedGame',
};

// Stats functions
export function getStats(): GameStats {
  try {
    const data = localStorage.getItem(KEYS.STATS);
    if (data) {
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
  return DEFAULT_STATS;
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function updateStatsOnGameComplete(duration: number): void {
  const stats = getStats();
  stats.puzzlesSolved += 1;
  stats.totalTime += duration;
  if (stats.bestTime === null || duration < stats.bestTime) {
    stats.bestTime = duration;
  }
  saveStats(stats);
}

export function updateStatsOnGameStart(): void {
  const stats = getStats();
  stats.puzzlesStarted += 1;
  saveStats(stats);
}

// History functions
export function getHistory(): GameRecord[] {
  try {
    const data = localStorage.getItem(KEYS.HISTORY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [];
}

export function addToHistory(record: GameRecord): void {
  try {
    const history = getHistory();
    history.unshift(record); // Add to beginning
    // Keep only last 5000 games
    const trimmed = history.slice(0, 5000);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.setItem(KEYS.STATS, JSON.stringify(DEFAULT_STATS));
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

// Settings functions
export function getSettings(): Settings {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Saved game functions
export function getSavedGame(): SavedGameState | null {
  try {
    const data = localStorage.getItem(KEYS.SAVED_GAME);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load saved game:', e);
  }
  return null;
}

export function saveGame(state: SavedGameState): void {
  try {
    localStorage.setItem(KEYS.SAVED_GAME, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(KEYS.SAVED_GAME);
  } catch (e) {
    console.error('Failed to clear saved game:', e);
  }
}

// Helper to convert Set<number>[][] to number[][] for storage
export function notesToArrays(notes: Set<number>[][]): number[][] {
  return notes.map(row =>
    row.map(cell => Array.from(cell)).flat()
  );
}

// Helper to convert stored number[][] back to Set<number>[][]
export function arraysToNotes(stored: number[][]): Set<number>[][] {
  // Each cell's notes were flattened, need to reconstruct
  // Actually, let's store it differently - as a 9x9 array of number arrays
  return stored.map(row => {
    // If it's the old format (flat), convert
    if (typeof row[0] === 'number') {
      return Array(9).fill(null).map(() => new Set<number>());
    }
    return (row as unknown as number[][]).map(cell => new Set(cell));
  });
}

// Better storage format for notes - 9x9 array of number arrays
export function notesToStorage(notes: Set<number>[][]): number[][][] {
  return notes.map(row => row.map(cell => Array.from(cell)));
}

export function notesFromStorage(stored: number[][][]): Set<number>[][] {
  return stored.map(row => row.map(cell => new Set(cell)));
}

// Format time helper
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date helper
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
