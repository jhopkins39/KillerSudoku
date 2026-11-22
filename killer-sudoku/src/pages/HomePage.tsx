import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { formatTime, getSavedGame, savedGameHasProgress, startNewGame } from '../utils/storage';
import { Difficulty, DIFFICULTIES } from '../types/puzzle';
import styles from './HomePage.module.css';

const LABELS: Record<Difficulty, { name: string; hint: string }> = {
  easy: { name: 'Easy', hint: 'Small cages' },
  medium: { name: 'Medium', hint: 'A real workout' },
  hard: { name: 'Hard', hint: 'Big cages' },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [saved] = useState(getSavedGame);
  const [choosing, setChoosing] = useState(false);

  const inProgress = saved !== null && savedGameHasProgress(saved);

  const startNew = (difficulty: Difficulty) => {
    updateSettings({ lastDifficulty: difficulty });
    startNewGame(difficulty);
    navigate('/play');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Killer Sudoku</h1>
        <p className={styles.subtitle}>Challenge your mind</p>
      </header>

      <nav className={styles.menu}>
        {inProgress && (
          <button className={`${styles.menuButton} ${styles.primary}`} onClick={() => navigate('/play')}>
            <span className={styles.buttonIcon}>▶</span>
            <span className={styles.buttonText}>
              Continue
              <span className={styles.buttonHint}>
                {LABELS[saved.difficulty].name} · {formatTime(saved.elapsedTime)}
              </span>
            </span>
          </button>
        )}

        {!choosing ? (
          <button
            className={`${styles.menuButton} ${inProgress ? '' : styles.primary}`}
            onClick={() => setChoosing(true)}
          >
            <span className={styles.buttonIcon}>＋</span>
            <span className={styles.buttonText}>New Puzzle</span>
          </button>
        ) : (
          <div className={styles.difficultyPanel}>
            <div className={styles.difficultyTitle}>Choose a difficulty</div>
            <div className={styles.difficultyRow}>
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`${styles.difficultyButton} ${settings.lastDifficulty === d ? styles.lastUsed : ''}`}
                  onClick={() => startNew(d)}
                >
                  <span className={styles.difficultyName}>{LABELS[d].name}</span>
                  <span className={styles.difficultyHint}>{LABELS[d].hint}</span>
                </button>
              ))}
            </div>
            {inProgress && (
              <p className={styles.warning}>Your current puzzle will be recorded as abandoned.</p>
            )}
            <button className={styles.cancel} onClick={() => setChoosing(false)}>
              Cancel
            </button>
          </div>
        )}

        <button className={styles.menuButton} onClick={() => navigate('/stats')}>
          <span className={styles.buttonIcon}>📊</span>
          <span className={styles.buttonText}>Stats & History</span>
        </button>

        <button className={styles.menuButton} onClick={() => navigate('/options')}>
          <span className={styles.buttonIcon}>⚙</span>
          <span className={styles.buttonText}>Options</span>
        </button>
      </nav>
    </div>
  );
}
