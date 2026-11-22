import { memo } from 'react';
import styles from './Cell.module.css';

interface CellProps {
  row: number;
  col: number;
  value: number | null;
  notes: number[];
  isSelected: boolean;
  /** Shares a row, column, box or cage with the selected cell. */
  isRelated: boolean;
  /** Holds the same digit as the selected cell. */
  isSameNumber: boolean;
  hasConflict: boolean;
  cageSum: number | null;
  cageBad: boolean;
  /** Digit to emphasise among this cell's notes. */
  highlightNote: number | null;
  onSelect: (row: number, col: number) => void;
}

function Cell({
  row,
  col,
  value,
  notes,
  isSelected,
  isRelated,
  isSameNumber,
  hasConflict,
  cageSum,
  cageBad,
  highlightNote,
  onSelect,
}: CellProps) {
  const classNames = [styles.cell];
  if (isRelated) classNames.push(styles.related);
  if (isSameNumber) classNames.push(styles.sameNumber);
  if (isSelected) classNames.push(styles.selected);
  if (hasConflict) classNames.push(styles.conflict);
  if (col % 3 === 2 && col !== 8) classNames.push(styles.boxRight);
  if (row % 3 === 2 && row !== 8) classNames.push(styles.boxBottom);
  if (col === 8) classNames.push(styles.lastCol);
  if (row === 8) classNames.push(styles.lastRow);

  const label = `Row ${row + 1}, column ${col + 1}${value ? `, ${value}` : ', empty'}${
    cageSum !== null ? `, cage sum ${cageSum}` : ''
  }`;

  return (
    <div
      className={classNames.join(' ')}
      onClick={() => onSelect(row, col)}
      role="gridcell"
      aria-selected={isSelected}
      aria-label={label}
    >
      {cageSum !== null && (
        <span className={`${styles.cageSum} ${cageBad ? styles.cageBad : ''}`}>{cageSum}</span>
      )}
      {value !== null ? (
        <span className={styles.value}>{value}</span>
      ) : notes.length > 0 ? (
        <div className={styles.notes}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <span key={n} className={`${styles.note} ${highlightNote === n ? styles.noteHighlight : ''}`}>
              {notes.includes(n) ? n : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(Cell);
