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

export default function App() {
  const [grid, setGrid] = useState<(number | null)[][]>(createEmptyGrid);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
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
    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = num;
      return newGrid;
    });
  }, [selectedCell]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCell === null) return;

      const key = e.key;
      if (key >= '1' && key <= '9') {
        handleNumberInput(parseInt(key));
      } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        handleNumberInput(null);
      } else if (key === 'ArrowUp' && selectedCell[0] > 0) {
        setSelectedCell([selectedCell[0] - 1, selectedCell[1]]);
      } else if (key === 'ArrowDown' && selectedCell[0] < 8) {
        setSelectedCell([selectedCell[0] + 1, selectedCell[1]]);
      } else if (key === 'ArrowLeft' && selectedCell[1] > 0) {
        setSelectedCell([selectedCell[0], selectedCell[1] - 1]);
      } else if (key === 'ArrowRight' && selectedCell[1] < 8) {
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
          puzzle={samplePuzzle}
          selectedCell={selectedCell}
          conflicts={conflicts}
          onCellClick={handleCellClick}
        />
      </main>

      <footer className={styles.footer}>
        <NumberPad onNumberClick={handleNumberInput} />
      </footer>

      {solved && (
        <div className={styles.winOverlay}>
          <div className={styles.winMessage}>
            <h2>Congratulations!</h2>
            <p>You solved the puzzle!</p>
            <button onClick={() => {
              setGrid(createEmptyGrid());
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
