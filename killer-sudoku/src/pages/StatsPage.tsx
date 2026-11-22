import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getHistory, formatTime, formatDate } from '../utils/storage';
import { DIFFICULTIES, Difficulty } from '../types/puzzle';
import styles from './StatsPage.module.css';

const LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const PAGE = 50;

export default function StatsPage() {
  const navigate = useNavigate();
  const [stats] = useState(getStats);
  const [history] = useState(getHistory);
  const [shown, setShown] = useState(PAGE);

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
              <span className={styles.statValue}>{stats.puzzlesSolved}</span>
              <span className={styles.statLabel}>Solved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.winRate === null ? '--' : `${stats.winRate}%`}</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.puzzlesStarted}</span>
              <span className={styles.statLabel}>Started</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.puzzlesAbandoned}</span>
              <span className={styles.statLabel}>Abandoned</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Times</h2>
          <div className={styles.table}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span />
              <span>Solved</span>
              <span>Best</span>
              <span>Average</span>
            </div>
            {DIFFICULTIES.map(d => {
              const s = stats.byDifficulty[d];
              return (
                <div key={d} className={styles.tableRow}>
                  <span className={styles.tableLabel}>{LABEL[d]}</span>
                  <span>{s.solved}</span>
                  <span>{s.bestTime === null ? '--:--' : formatTime(s.bestTime)}</span>
                  <span>{s.averageTime === null ? '--:--' : formatTime(s.averageTime)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Games</h2>
          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No games finished yet.</p>
              <p>Solve a puzzle to start tracking your progress!</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.slice(0, shown).map(game => (
                <div key={game.id} className={styles.historyItem}>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyDate}>{formatDate(game.date)}</span>
                    <span className={game.completed ? styles.statusSolved : styles.statusAbandoned}>
                      {game.completed ? 'Solved' : 'Abandoned'}
                      {game.difficulty ? ` · ${LABEL[game.difficulty]}` : ''}
                    </span>
                  </div>
                  <span className={styles.historyTime}>{formatTime(game.duration)}</span>
                </div>
              ))}
              {history.length > shown && (
                <button className={styles.moreButton} onClick={() => setShown(n => n + PAGE)}>
                  Show more
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
