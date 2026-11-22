import { useMemo } from 'react';
import Cell from './Cell';
import { Puzzle } from '../../types/puzzle';
import { buildCageMap, getCageId, getCageOutlines, isCageLabelCell } from '../../utils/validation';
import styles from './Grid.module.css';

interface GridProps {
  grid: (number | null)[][];
  notes: number[][][];
  puzzle: Puzzle;
  selectedCell: [number, number] | null;
  conflicts: Set<string>;
  badCages: Set<number>;
  highlightRegion: boolean;
  highlightSameNumbers: boolean;
  onCellClick: (row: number, col: number) => void;
}

const SCALE = 100; // SVG units per cell

export default function Grid({
  grid,
  notes,
  puzzle,
  selectedCell,
  conflicts,
  badCages,
  highlightRegion,
  highlightSameNumbers,
  onCellClick,
}: GridProps) {
  const cageMap = useMemo(() => buildCageMap(puzzle), [puzzle]);
  const outlines = useMemo(() => getCageOutlines(puzzle), [puzzle]);
  const labels = useMemo(
    () => Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => isCageLabelCell(puzzle, r, c))),
    [puzzle],
  );

  const [selRow, selCol] = selectedCell ?? [-1, -1];
  const selCage = selectedCell ? getCageId(cageMap, selRow, selCol) : -2;
  const selValue = selectedCell ? grid[selRow][selCol] : null;

  const cells = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cageId = getCageId(cageMap, row, col);
      const isSelected = row === selRow && col === selCol;
      const isRelated =
        highlightRegion &&
        selectedCell !== null &&
        (row === selRow ||
          col === selCol ||
          (Math.floor(row / 3) === Math.floor(selRow / 3) && Math.floor(col / 3) === Math.floor(selCol / 3)) ||
          cageId === selCage);
      const value = grid[row][col];
      const isSameNumber = highlightSameNumbers && selValue !== null && value === selValue && !isSelected;

      cells.push(
        <Cell
          key={`${row}-${col}`}
          row={row}
          col={col}
          value={value}
          notes={notes[row][col]}
          isSelected={isSelected}
          isRelated={isRelated}
          isSameNumber={isSameNumber}
          hasConflict={conflicts.has(`${row},${col}`)}
          cageSum={labels[row][col]}
          cageBad={badCages.has(cageId)}
          highlightNote={highlightSameNumbers ? selValue : null}
          onSelect={onCellClick}
        />,
      );
    }
  }

  return (
    <div className={styles.grid} role="grid" aria-label="Killer sudoku grid">
      {cells}
      <svg
        className={styles.cages}
        viewBox={`0 0 ${9 * SCALE} ${9 * SCALE}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {outlines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1 * SCALE} y1={y1 * SCALE} x2={x2 * SCALE} y2={y2 * SCALE} />
        ))}
      </svg>
    </div>
  );
}
