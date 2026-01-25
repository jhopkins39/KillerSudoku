import { useMemo } from 'react';
import Cell from './Cell';
import { Puzzle } from '../../types/puzzle';
import { buildCageMap, getCageBorders, isCageLabelCell } from '../../utils/validation';
import styles from './Grid.module.css';

interface GridProps {
  grid: (number | null)[][];
  notes: Set<number>[][];
  puzzle: Puzzle;
  selectedCell: [number, number] | null;
  conflicts: Set<string>;
  onCellClick: (row: number, col: number) => void;
}

export default function Grid({ grid, notes, puzzle, selectedCell, conflicts, onCellClick }: GridProps) {
  const cageMap = useMemo(() => buildCageMap(puzzle), [puzzle]);

  return (
    <div className={styles.grid}>
      {Array(9).fill(null).map((_, row) => (
        <div key={row} className={styles.row}>
          {Array(9).fill(null).map((_, col) => {
            const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
            const hasConflict = conflicts.has(`${row},${col}`);
            const cageBorders = getCageBorders(cageMap, row, col);
            const cageSum = isCageLabelCell(puzzle, row, col);

            return (
              <Cell
                key={col}
                row={row}
                col={col}
                value={grid[row][col]}
                notes={notes[row][col]}
                isSelected={isSelected}
                hasConflict={hasConflict}
                cageBorders={cageBorders}
                cageSum={cageSum}
                onClick={() => onCellClick(row, col)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
