export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ cols: 8, rows: 8, mines: 10, label: 'Лёгкий' }),
  medium: Object.freeze({ cols: 16, rows: 16, mines: 40, label: 'Средний' }),
  hard: Object.freeze({ cols: 30, rows: 16, mines: 99, label: 'Сложный' }),
});

const makeCell = (row, col) => ({ row, col, isMine: false, adjacentMines: 0, isOpen: false, isFlagged: false });
const coord = cell => ({ row: cell.row, col: cell.col });
const mergeResult = (target, source) => {
  target.opened.push(...source.opened);
  target.flagged.push(...source.flagged);
  target.unflagged.push(...source.unflagged);
  if (source.exploded) target.exploded = source.exploded;
  target.changed = target.changed || source.changed;
  target.outcome = source.outcome;
  return target;
};

export class MinesweeperBoard {
  constructor({ cols, rows, mines, rng = Math.random }) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2) throw new RangeError('Board dimensions must be integers >= 2');
    if (!Number.isInteger(mines) || mines < 1 || mines >= cols * rows - 4) throw new RangeError('Invalid mine count');
    this.cols = cols; this.rows = rows; this.mineCount = mines; this.rng = rng;
    this.generated = false; this.outcome = 'ready'; this.flagCount = 0; this.openedSafeCount = 0;
    this.cells = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => makeCell(row, col)));
  }
  get safeCellCount() { return this.cols * this.rows - this.mineCount; }
  inBounds(row, col) { return row >= 0 && row < this.rows && col >= 0 && col < this.cols; }
  getCell(row, col) { return this.inBounds(row, col) ? this.cells[row][col] : null; }
  neighbors(row, col) {
    const result = [];
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const cell = this.getCell(row + dr, col + dc);
      if (cell) result.push(cell);
    }
    return result;
  }
  snapshot() { return this.cells.map(row => row.map(cell => ({ ...cell }))); }
  isCorner(row, col) { return (row === 0 || row === this.rows - 1) && (col === 0 || col === this.cols - 1); }
  makeResult() { return { changed: false, opened: [], flagged: [], unflagged: [], exploded: null, outcome: this.outcome }; }
  placeMines(firstRow, firstCol) {
    const eligible = this.cells.flat().filter(cell => !this.isCorner(cell.row, cell.col) && !(cell.row === firstRow && cell.col === firstCol));
    if (eligible.length < this.mineCount) throw new RangeError('Not enough eligible cells');
    for (let i = eligible.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    for (const cell of eligible.slice(0, this.mineCount)) cell.isMine = true;
    for (const cell of this.cells.flat()) cell.adjacentMines = this.neighbors(cell.row, cell.col).filter(n => n.isMine).length;
    this.generated = true; this.outcome = 'playing';
  }
  toggleFlag(row, col) {
    const result = this.makeResult();
    if (this.outcome === 'won' || this.outcome === 'lost') return result;
    const cell = this.getCell(row, col);
    if (!cell || cell.isOpen) return result;
    cell.isFlagged = !cell.isFlagged; result.changed = true;
    if (cell.isFlagged) { this.flagCount += 1; result.flagged.push(coord(cell)); }
    else { this.flagCount -= 1; result.unflagged.push(coord(cell)); }
    result.outcome = this.outcome; return result;
  }
  revealSafeRegion(startCell, result) {
    const queue = [startCell];
    while (queue.length) {
      const cell = queue.shift();
      if (!cell || cell.isOpen || cell.isFlagged || cell.isMine) continue;
      cell.isOpen = true; this.openedSafeCount += 1; result.opened.push(coord(cell)); result.changed = true;
      if (cell.adjacentMines !== 0) continue;
      for (const neighbor of this.neighbors(cell.row, cell.col)) if (!neighbor.isOpen && !neighbor.isFlagged && !neighbor.isMine) queue.push(neighbor);
    }
  }
  open(row, col) {
    const result = this.makeResult();
    if (this.outcome === 'won' || this.outcome === 'lost') return result;
    const cell = this.getCell(row, col);
    if (!cell || cell.isOpen || cell.isFlagged) return result;
    if (!this.generated) this.placeMines(row, col);
    if (cell.isMine) {
      cell.isOpen = true; this.outcome = 'lost'; result.changed = true; result.exploded = coord(cell); result.outcome = this.outcome; return result;
    }
    this.revealSafeRegion(cell, result);
    if (this.openedSafeCount === this.safeCellCount) this.outcome = 'won';
    result.outcome = this.outcome; return result;
  }
  chord(row, col) {
    const result = this.makeResult();
    if (this.outcome !== 'playing') return result;
    const cell = this.getCell(row, col);
    if (!cell || !cell.isOpen || cell.adjacentMines === 0) return result;
    const around = this.neighbors(row, col);
    if (around.filter(n => n.isFlagged).length !== cell.adjacentMines) return result;
    for (const neighbor of around) {
      if (neighbor.isOpen || neighbor.isFlagged) continue;
      mergeResult(result, this.open(neighbor.row, neighbor.col));
      if (this.outcome === 'lost' || this.outcome === 'won') break;
    }
    result.outcome = this.outcome; return result;
  }
}
