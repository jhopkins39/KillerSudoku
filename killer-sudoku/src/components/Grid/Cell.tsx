import { CellBorders } from '../../types/puzzle';
import styles from './Cell.module.css';

interface CellProps {
  row: number;
  col: number;
  value: number | null;
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
      {cageSum !== null && (
        <span className={styles.cageSum}>{cageSum}</span>
      )}
      {value !== null && (
        <span className={styles.value}>{value}</span>
      )}
    </div>
  );
}
