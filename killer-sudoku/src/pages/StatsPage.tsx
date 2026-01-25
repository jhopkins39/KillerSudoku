import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStats,
  getHistory,
  formatTime,
  formatDate,
  GameStats,
  GameRecord,
} from '../utils/storage';
import styles from './StatsPage.module.css';

export default function StatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [history, setHistory] = useState<GameRecord[]>([]);

  useEffect(() => {
    setStats(getStats());
    setHistory(getHistory());
  }, []);

  const averageTime = stats && stats.puzzlesSolved > 0
    ? Math.round(stats.totalTime / stats.puzzlesSolved)
    : null;

  const winRate = stats && stats.puzzlesStarted > 0
    ? Math.round((stats.puzzlesSolved / stats.puzzlesStarted) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className={styles.title}>Stats & History</h1>
        <div className={styles.spacer} />
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.puzzlesSolved ?? 0}</span>
              <span className={styles.statLabel}>Puzzles Solved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {stats?.bestTime ? formatTime(stats.bestTime) : '--:--'}
              </span>
              <span className={styles.statLabel}>Best Time</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {averageTime ? formatTime(averageTime) : '--:--'}
              </span>
              <span className={styles.statLabel}>Average Time</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Games</h2>
          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No games played yet.</p>
              <p>Start a new puzzle to track your progress!</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map(game => (
                <div key={game.id} className={styles.historyItem}>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyDate}>{formatDate(game.date)}</span>
                    <span className={styles.historyStatus}>
                      {game.completed ? 'Completed' : 'Abandoned'}
                    </span>
                  </div>
                  <span className={styles.historyTime}>{formatTime(game.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
