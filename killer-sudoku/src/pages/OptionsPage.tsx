import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { clearHistory, Settings } from '../utils/storage';
import styles from './OptionsPage.module.css';

type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const GAMEPLAY_OPTIONS: { key: BooleanSetting; label: string; description: string }[] = [
  { key: 'highlightConflicts', label: 'Highlight Conflicts', description: 'Show repeated digits and broken cage sums in red' },
  { key: 'highlightSameNumbers', label: 'Highlight Same Numbers', description: 'Highlight matching digits and notes when a cell is selected' },
  { key: 'highlightRegion', label: 'Highlight Row, Column, Box & Cage', description: 'Shade the cells that share a region with the selected cell' },
  { key: 'autoClearNotes', label: 'Auto-clear Notes', description: 'Placing a digit removes it from notes in the same row, column, box and cage' },
  { key: 'showTimer', label: 'Show Timer', description: 'Display elapsed time during puzzles' },
];

export default function OptionsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleResetStats = () => {
    clearHistory();
    setShowConfirm(false);
    setCleared(true);
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
          {GAMEPLAY_OPTIONS.map(({ key, label, description }) => (
            <label key={key} className={styles.option}>
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{label}</span>
                <span className={styles.optionDescription}>{description}</span>
              </span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={e => updateSettings({ [key]: e.target.checked })}
                className={styles.toggle}
              />
            </label>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>Dark Mode</span>
              <span className={styles.optionDescription}>Use a dark color theme</span>
            </span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={e => updateSettings({ darkMode: e.target.checked })}
              className={styles.toggle}
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data</h2>

          {!showConfirm ? (
            <button
              className={styles.dangerButton}
              onClick={() => setShowConfirm(true)}
              disabled={cleared}
            >
              {cleared ? 'Statistics cleared' : 'Reset All Statistics'}
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
