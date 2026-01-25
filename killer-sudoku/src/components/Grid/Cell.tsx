import { CellBorders } from '../../types/puzzle';
import styles from './Cell.module.css';

interface CellProps {
  row: number;
  col: number;
  value: number | null;
  notes: Set<number>;
  isSelected: boolean;
  hasConflict: boolean;
  cageBorders: CellBorders;
  cageSum: number | null;
  onClick: () => void;
}

export default function Cell({
  row,
  col,
  value,
  notes,
  isSelected,
  hasConflict,
  cageBorders,
  cageSum,
  onClick,
}: CellProps) {
  // Build class names
  const classNames = [styles.cell];

  if (isSelected) classNames.push(styles.selected);
  if (hasConflict) classNames.push(styles.conflict);

  // Cage borders (dotted style)
  if (cageBorders.top) classNames.push(styles.cageTop);
  if (cageBorders.right) classNames.push(styles.cageRight);
  if (cageBorders.bottom) classNames.push(styles.cageBottom);
  if (cageBorders.left) classNames.push(styles.cageLeft);

  // 3x3 box borders (thicker solid lines)
  if (row % 3 === 0 && row !== 0) classNames.push(styles.boxTop);
  if (col % 3 === 0 && col !== 0) classNames.push(styles.boxLeft);

  return (
    <div className={classNames.join(' ')} onClick={onClick}>
      <div className={styles.cageBorder} />
      {cageSum !== null && (
        <span className={styles.cageSum}>{cageSum}</span>
      )}
      {value !== null ? (
        <span className={styles.value}>{value}</span>
      ) : notes.size > 0 ? (
        <div className={styles.notes}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <span key={n} className={styles.note}>
              {notes.has(n) ? n : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
