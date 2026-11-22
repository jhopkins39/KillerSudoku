import styles from './NumberPad.module.css';

interface NumberPadProps {
  onNumberClick: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  canUndo: boolean;
  notesMode: boolean;
  onToggleNotesMode: () => void;
  /** Digits already placed nine times; shown dimmed. */
  completedDigits: Set<number>;
}

export default function NumberPad({
  onNumberClick,
  onErase,
  onUndo,
  canUndo,
  notesMode,
  onToggleNotesMode,
  completedDigits,
}: NumberPadProps) {
  return (
    <div className={styles.pad}>
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.action}`} onClick={onUndo} disabled={!canUndo}>
          <span className={styles.icon} aria-hidden="true">↶</span>
          Undo
        </button>
        <button className={`${styles.button} ${styles.action}`} onClick={onErase}>
          <span className={styles.icon} aria-hidden="true">⌫</span>
          Erase
        </button>
        <button
          className={`${styles.button} ${styles.action} ${notesMode ? styles.notesActive : ''}`}
          onClick={onToggleNotesMode}
          aria-pressed={notesMode}
        >
          <span className={styles.icon} aria-hidden="true">✎</span>
          Notes {notesMode ? 'on' : 'off'}
        </button>
      </div>
      <div className={`${styles.digits} ${notesMode ? styles.digitsNotes : ''}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            className={`${styles.button} ${styles.digit} ${completedDigits.has(num) ? styles.done : ''}`}
            onClick={() => onNumberClick(num)}
            aria-label={`${notesMode ? 'Note' : 'Place'} ${num}`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
