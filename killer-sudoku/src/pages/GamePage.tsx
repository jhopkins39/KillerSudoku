import { useState, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '../components/Grid/Grid';
import NumberPad from '../components/NumberPad/NumberPad';
import { getAllConflicts, getBadCages, getCageConflicts, isPuzzleSolved } from '../utils/validation';
import {
  saveGame,
  loadOrStartGame,
  startNewGame,
  recordWin,
  toGameState,
  formatTime,
  SavedGameState,
} from '../utils/storage';
import { gameReducer } from '../lib/game';
import { getPuzzleById } from '../lib/puzzles';
import { useGameTimer } from '../hooks/useGameTimer';
import { useSettings } from '../contexts/SettingsContext';
import { Difficulty } from '../types/puzzle';
import styles from './GamePage.module.css';

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export default function GamePage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  // Loading is idempotent (it saves the new game it creates), so StrictMode's
  // double-invoked initializer can't start two games.
  const [game, setGame] = useState<SavedGameState>(() => loadOrStartGame(settings.lastDifficulty));
  const puzzle = useMemo(() => getPuzzleById(game.puzzleId)!, [game.puzzleId]);
  const [state, dispatch] = useReducer(gameReducer, game, toGameState);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const solved = finalTime !== null;

  const timer = useGameTimer(game.elapsedTime, !solved);

  // Persist the game. Runs on every move and every timer tick, so the elapsed
  // time survives the app being closed at any moment.
  const persist = useCallback(() => {
    if (solved) return;
    saveGame({ ...game, ...state, elapsedTime: timer.getElapsed() });
  }, [game, state, solved, timer]);

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    persist();
  }, [persist, timer.elapsed]);

  useEffect(() => {
    const flush = () => persistRef.current();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  // Check for a win
  useEffect(() => {
    if (solved || !isPuzzleSolved(state.grid, puzzle)) return;
    const time = timer.stop();
    setFinalTime(time);
    setSelectedCell(null);
    recordWin(game, time);
  }, [state.grid, puzzle, solved, game, timer]);

  const conflicts = useMemo(() => {
    if (!settings.highlightConflicts) return new Set<string>();
    return new Set([...getAllConflicts(state.grid), ...getCageConflicts(state.grid, puzzle)]);
  }, [state.grid, puzzle, settings.highlightConflicts]);

  const badCages = useMemo(
    () => (settings.highlightConflicts ? getBadCages(state.grid, puzzle) : new Set<number>()),
    [state.grid, puzzle, settings.highlightConflicts],
  );

  const completedDigits = useMemo(() => {
    const counts = new Map<number, number>();
    state.grid.flat().forEach(v => v !== null && counts.set(v, (counts.get(v) ?? 0) + 1));
    return new Set([...counts].filter(([, n]) => n >= 9).map(([d]) => d));
  }, [state.grid]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell([row, col]);
  }, []);

  const handleNumberInput = useCallback(
    (num: number) => {
      if (selectedCell === null || solved) return;
      const [row, col] = selectedCell;
      if (notesMode) {
        dispatch({ type: 'toggleNote', row, col, value: num });
      } else {
        dispatch({ type: 'setValue', row, col, value: num, puzzle, autoClearNotes: settings.autoClearNotes });
      }
    },
    [selectedCell, notesMode, puzzle, settings.autoClearNotes, solved],
  );

  const handleErase = useCallback(() => {
    if (selectedCell === null || solved) return;
    dispatch({ type: 'erase', row: selectedCell[0], col: selectedCell[1] });
  }, [selectedCell, solved]);

  const handleUndo = useCallback(() => {
    if (!solved) dispatch({ type: 'undo' });
  }, [solved]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'n') {
        setNotesMode(prev => !prev);
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleErase();
        return;
      }

      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        setSelectedCell(prev => {
          if (!prev) return [0, 0];
          return [Math.min(8, Math.max(0, prev[0] + move[0])), Math.min(8, Math.max(0, prev[1] + move[1]))];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberInput, handleErase, handleUndo]);

  const handleReset = () => {
    // Clears the board but keeps the same game (and its timer): undo brings it back.
    dispatch({ type: 'reset' });
    setSelectedCell(null);
  };

  const handleNewPuzzle = (difficulty: Difficulty) => {
    const next = startNewGame(difficulty);
    updateSettings({ lastDifficulty: difficulty });
    setGame(next);
    dispatch({ type: 'load', state: toGameState(next) });
    timer.restart(next.elapsedTime);
    setFinalTime(null);
    setSelectedCell(null);
    setNotesMode(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ← Back
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>Killer Sudoku</h1>
          <span className={styles.subtitle}>
            {DIFFICULTY_LABEL[game.difficulty]}
            {settings.showTimer && (
              <>
                {' · '}
                <span className={styles.timer}>{formatTime(finalTime ?? timer.elapsed)}</span>
              </>
            )}
          </span>
        </div>
        <button className={styles.resetButton} onClick={handleReset} disabled={solved}>
          Reset
        </button>
      </header>

      <main className={styles.main}>
        <Grid
          grid={state.grid}
          notes={state.notes}
          puzzle={puzzle}
          selectedCell={selectedCell}
          conflicts={conflicts}
          badCages={badCages}
          highlightRegion={settings.highlightRegion}
          highlightSameNumbers={settings.highlightSameNumbers}
          onCellClick={handleCellClick}
        />
      </main>

      <footer className={styles.footer}>
        <NumberPad
          onNumberClick={handleNumberInput}
          onErase={handleErase}
          onUndo={handleUndo}
          canUndo={state.undoStack.length > 0 && !solved}
          notesMode={notesMode}
          onToggleNotesMode={() => setNotesMode(prev => !prev)}
          completedDigits={completedDigits}
        />
      </footer>

      {solved && (
        <div className={styles.winOverlay} role="dialog" aria-modal="true" aria-labelledby="win-title">
          <div className={styles.winMessage}>
            <h2 id="win-title">Congratulations!</h2>
            <p>
              You solved this {DIFFICULTY_LABEL[game.difficulty].toLowerCase()} puzzle in {formatTime(finalTime)}.
            </p>
            <button className={styles.primaryButton} onClick={() => handleNewPuzzle(game.difficulty)}>
              New {DIFFICULTY_LABEL[game.difficulty]} Puzzle
            </button>
            <div className={styles.winSecondary}>
              {(['easy', 'medium', 'hard'] as Difficulty[])
                .filter(d => d !== game.difficulty)
                .map(d => (
                  <button key={d} className={styles.secondaryButton} onClick={() => handleNewPuzzle(d)}>
                    Try {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
            </div>
            <button className={styles.linkButton} onClick={() => navigate('/')}>
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
