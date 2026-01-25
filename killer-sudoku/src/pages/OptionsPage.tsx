import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { clearHistory } from '../utils/storage';
import styles from './OptionsPage.module.css';

export default function OptionsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetStats = () => {
    clearHistory();
    setShowConfirm(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className={styles.title}>Options</h1>
        <div className={styles.spacer} />
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Gameplay</h2>

          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>Highlight Conflicts</span>
              <span className={styles.optionDescription}>Show errors in red</span>
            </span>
            <input
              type="checkbox"
              checked={settings.highlightConflicts}
              onChange={(e) => updateSettings({ highlightConflicts: e.target.checked })}
              className={styles.toggle}
            />
          </label>

          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>Highlight Same Numbers</span>
              <span className={styles.optionDescription}>Highlight matching numbers when selected</span>
            </span>
            <input
              type="checkbox"
              checked={settings.highlightSameNumbers}
              onChange={(e) => updateSettings({ highlightSameNumbers: e.target.checked })}
              className={styles.toggle}
            />
          </label>

          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>Show Timer</span>
              <span className={styles.optionDescription}>Display elapsed time during puzzles</span>
            </span>
            <input
              type="checkbox"
              checked={settings.showTimer}
              onChange={(e) => updateSettings({ showTimer: e.target.checked })}
              className={styles.toggle}
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>Dark Mode</span>
              <span className={styles.optionDescription}>Use dark color theme (coming soon)</span>
            </span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSettings({ darkMode: e.target.checked })}
              className={styles.toggle}
              disabled
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data</h2>

          {!showConfirm ? (
            <button
              className={styles.dangerButton}
              onClick={() => setShowConfirm(true)}
            >
              Reset All Statistics
            </button>
          ) : (
            <div className={styles.confirmBox}>
              <p>Are you sure? This will delete all your stats and game history.</p>
              <div className={styles.confirmButtons}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmDeleteButton}
                  onClick={handleResetStats}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
