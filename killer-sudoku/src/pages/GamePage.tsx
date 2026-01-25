import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '../components/Grid/Grid';
import NumberPad from '../components/NumberPad/NumberPad';
import { samplePuzzle } from '../data/samplePuzzle';
import { getAllConflicts, getCageConflicts, isPuzzleSolved } from '../utils/validation';
import {
  getSavedGame,
  saveGame,
  clearSavedGame,
  notesToStorage,
  notesFromStorage,
  updateStatsOnGameComplete,
  updateStatsOnGameStart,
  addToHistory,
  formatTime,
  GameRecord,
} from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import styles from './GamePage.module.css';

const PUZZLE_ID = 'sample-puzzle-1'; // For now, single puzzle

// Initialize empty 9x9 grid
function createEmptyGrid(): (number | null)[][] {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

// Initialize empty 9x9 notes grid
function createEmptyNotes(): Set<number>[][] {
  return Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>()));
}

export default function GamePage() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [grid, setGrid] = useState<(number | null)[][]>(createEmptyGrid);
  const [notes, setNotes] = useState<Set<number>[][]>(createEmptyNotes);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [solved, setSolved] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<number>(Date.now());
  const baseElapsedRef = useRef<number>(0);
  const gameInitialized = useRef(false);

  // Load saved game on mount
  useEffect(() => {
    if (gameInitialized.current) return;
    gameInitialized.current = true;

    const saved = getSavedGame();
    if (saved && saved.puzzleId === PUZZLE_ID) {
      setGrid(saved.grid);
      setNotes(notesFromStorage(saved.notes as unknown as number[][][]));
      baseElapsedRef.current = saved.elapsedTime;
      setElapsedTime(saved.elapsedTime);
    } else {
      // New game
      updateStatsOnGameStart();
    }
    startTimeRef.current = Date.now();
  }, []);

  // Timer
  useEffect(() => {
    if (solved) return;

    const interval = setInterval(() => {
      const sessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(baseElapsedRef.current + sessionTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [solved]);

  // Auto-save game state
  useEffect(() => {
    if (solved) return;

    const sessionTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    saveGame({
      grid,
      notes: notesToStorage(notes) as unknown as number[][],
      puzzleId: PUZZLE_ID,
      startTime: startTimeRef.current,
      elapsedTime: baseElapsedRef.current + sessionTime,
    });
  }, [grid, notes, solved]);

  // Compute all conflicts
  const conflicts = useMemo(() => {
    if (!settings.highlightConflicts) return new Set<string>();
    const sudokuConflicts = getAllConflicts(grid);
    const cageConflicts = getCageConflicts(grid, samplePuzzle);
    return new Set([...sudokuConflicts, ...cageConflicts]);
  }, [grid, settings.highlightConflicts]);

  // Handle cell selection
  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell([row, col]);
  }, []);

  // Handle number input
  const handleNumberInput = useCallback((num: number | null) => {
    if (selectedCell === null) return;

    const [row, col] = selectedCell;

    if (notesMode) {
      if (num === null) {
        setNotes(prev => {
          const newNotes = prev.map(r => r.map(s => new Set(s)));
          newNotes[row][col] = new Set();
          return newNotes;
        });
      } else {
        setNotes(prev => {
          const newNotes = prev.map(r => r.map(s => new Set(s)));
          const cellNotes = newNotes[row][col];
          if (cellNotes.has(num)) {
            cellNotes.delete(num);
          } else {
            cellNotes.add(num);
          }
          return newNotes;
        });
      }
    } else {
      setGrid(prev => {
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = num;
        return newGrid;
      });
      if (num !== null) {
        setNotes(prev => {
          const newNotes = prev.map(r => r.map(s => new Set(s)));
          newNotes[row][col] = new Set();
          return newNotes;
        });
      }
    }
  }, [selectedCell, notesMode]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === 'n') {
        setNotesMode(prev => !prev);
        return;
      }

      if (selectedCell === null) return;

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleNumberInput(null);
      } else if (e.key === 'ArrowUp' && selectedCell[0] > 0) {
        setSelectedCell([selectedCell[0] - 1, selectedCell[1]]);
      } else if (e.key === 'ArrowDown' && selectedCell[0] < 8) {
        setSelectedCell([selectedCell[0] + 1, selectedCell[1]]);
      } else if (e.key === 'ArrowLeft' && selectedCell[1] > 0) {
        setSelectedCell([selectedCell[0], selectedCell[1] - 1]);
      } else if (e.key === 'ArrowRight' && selectedCell[1] < 8) {
        setSelectedCell([selectedCell[0], selectedCell[1] + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, handleNumberInput]);

  // Check for win
  useEffect(() => {
    if (isPuzzleSolved(grid, samplePuzzle) && !solved) {
      setSolved(true);

      // Record completion
      const finalTime = elapsedTime;
      updateStatsOnGameComplete(finalTime);

      const record: GameRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration: finalTime,
        completed: true,
        puzzleId: PUZZLE_ID,
      };
      addToHistory(record);
      clearSavedGame();
    }
  }, [grid, solved, elapsedTime]);

  const handleReset = () => {
    setGrid(createEmptyGrid());
    setNotes(createEmptyNotes());
    setSolved(false);
    setSelectedCell(null);
    setElapsedTime(0);
    baseElapsedRef.current = 0;
    startTimeRef.current = Date.now();
    clearSavedGame();
    updateStatsOnGameStart();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ← Back
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>Killer Sudoku</h1>
          {settings.showTimer && (
            <span className={styles.timer}>{formatTime(elapsedTime)}</span>
          )}
        </div>
        <button className={styles.resetButton} onClick={handleReset}>
          Reset
        </button>
      </header>

      <main className={styles.main}>
        <Grid
          grid={grid}
          notes={notes}
          puzzle={samplePuzzle}
          selectedCell={selectedCell}
          conflicts={conflicts}
          onCellClick={handleCellClick}
        />
      </main>

      <footer className={styles.footer}>
        <NumberPad
          onNumberClick={handleNumberInput}
          notesMode={notesMode}
          onToggleNotesMode={() => setNotesMode(prev => !prev)}
        />
      </footer>

      {solved && (
        <div className={styles.winOverlay}>
          <div className={styles.winMessage}>
            <h2>Congratulations!</h2>
            <p>You solved the puzzle in {formatTime(elapsedTime)}!</p>
            <button onClick={handleReset}>
              Play Again
            </button>
            <button onClick={() => navigate('/')} className={styles.homeButton}>
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
