import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Killer Sudoku</h1>
        <p className={styles.subtitle}>Challenge your mind</p>
      </header>

      <nav className={styles.menu}>
        <button
          className={styles.menuButton}
          onClick={() => navigate('/play')}
        >
          <span className={styles.buttonIcon}>▶</span>
          <span className={styles.buttonText}>New Puzzle</span>
        </button>

        <button
          className={styles.menuButton}
          onClick={() => navigate('/stats')}
        >
          <span className={styles.buttonIcon}>📊</span>
          <span className={styles.buttonText}>Stats & History</span>
        </button>

        <button
          className={styles.menuButton}
          onClick={() => navigate('/options')}
        >
          <span className={styles.buttonIcon}>⚙</span>
          <span className={styles.buttonText}>Options</span>
        </button>
      </nav>
    </div>
  );
}
