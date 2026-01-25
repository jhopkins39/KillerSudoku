import { useState, useCallback, useEffect, useMemo } from 'react';
import Grid from './Grid/Grid';
import NumberPad from './NumberPad/NumberPad';
import { samplePuzzle } from '../data/samplePuzzle';
import { getAllConflicts, getCageConflicts, isPuzzleSolved } from '../utils/validation';
import styles from './App.module.css';

// Initialize empty 9x9 grid
function createEmptyGrid(): (number | null)[][] {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

// Initialize empty 9x9 notes grid
function createEmptyNotes(): Set<number>[][] {
  return Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>()));
}

export default function App() {
  const [grid, setGrid] = useState<(number | null)[][]>(createEmptyGrid);
  const [notes, setNotes] = useState<Set<number>[][]>(createEmptyNotes);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [solved, setSolved] = useState(false);

  // Compute all conflicts
  const conflicts = useMemo(() => {
    const sudokuConflicts = getAllConflicts(grid);
    const cageConflicts = getCageConflicts(grid, samplePuzzle);
    return new Set([...sudokuConflicts, ...cageConflicts]);
  }, [grid]);

  // Handle cell selection
  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell([row, col]);
  }, []);

  // Handle number input
  const handleNumberInput = useCallback((num: number | null) => {
    if (selectedCell === null) return;

    const [row, col] = selectedCell;

    if (notesMode) {
      // Notes mode: toggle the number in notes
      if (num === null) {
        // Clear all notes for this cell
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
      // Normal mode: set the value and clear notes
      setGrid(prev => {
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = num;
        return newGrid;
      });
      // Clear notes when entering a value
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

      // Toggle notes mode with 'n'
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
    if (isPuzzleSolved(grid, samplePuzzle)) {
      setSolved(true);
    }
  }, [grid]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Killer Sudoku</h1>
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
            <p>You solved the puzzle!</p>
            <button onClick={() => {
              setGrid(createEmptyGrid());
              setNotes(createEmptyNotes());
              setSolved(false);
              setSelectedCell(null);
            }}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
