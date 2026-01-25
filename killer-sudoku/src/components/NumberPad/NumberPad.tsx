import styles from './NumberPad.module.css';

interface NumberPadProps {
  onNumberClick: (num: number | null) => void;
  notesMode: boolean;
  onToggleNotesMode: () => void;
}

export default function NumberPad({ onNumberClick, notesMode, onToggleNotesMode }: NumberPadProps) {
  return (
    <div className={styles.numberPad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <button
          key={num}
          className={styles.button}
          onClick={() => onNumberClick(num)}
        >
          {num}
        </button>
      ))}
      <button
        className={`${styles.button} ${styles.clearButton}`}
        onClick={() => onNumberClick(null)}
      >
        Clear
      </button>
      <button
        className={`${styles.button} ${notesMode ? styles.notesActive : styles.notesButton}`}
        onClick={onToggleNotesMode}
      >
        Notes
      </button>
    </div>
  );
}
