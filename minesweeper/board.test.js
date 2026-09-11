import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, MinesweeperBoard } from './board.js';

const mineCells = board => board.cells.flat().filter(cell => cell.isMine);
function seededRng(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
function boardFromMines(rows, cols, mineCoordinates) {
  const board = new MinesweeperBoard({ rows, cols, mines: mineCoordinates.length, rng: seededRng(1) });
  board.generated = true;
  board.outcome = 'playing';
  for (const [row, col] of mineCoordinates) board.getCell(row, col).isMine = true;
  for (const cell of board.cells.flat()) cell.adjacentMines = board.neighbors(cell.row, cell.col).filter(n => n.isMine).length;
  return board;
}

test('difficulty presets match classic sizes and mine counts', () => {
  assert.deepEqual(DIFFICULTIES.easy, { cols: 8, rows: 8, mines: 10, label: 'Лёгкий' });
  assert.deepEqual(DIFFICULTIES.medium, { cols: 16, rows: 16, mines: 40, label: 'Средний' });
  assert.deepEqual(DIFFICULTIES.hard, { cols: 30, rows: 16, mines: 99, label: 'Сложный' });
});

test('new board starts ungenerated with closed unflagged cells', () => {
  const board = new MinesweeperBoard(DIFFICULTIES.easy);
  assert.equal(board.generated, false);
  assert.equal(board.outcome, 'ready');
  assert.equal(board.flagCount, 0);
  assert.equal(board.openedSafeCount, 0);
  assert.equal(board.getCell(0, 0).isOpen, false);
  assert.equal(board.getCell(0, 0).isFlagged, false);
  assert.equal(board.neighbors(0, 0).length, 3);
});

test('first opening generates exact mine count while protecting first cell and all corners', () => {
  for (const preset of Object.values(DIFFICULTIES)) {
    const board = new MinesweeperBoard({ ...preset, rng: seededRng(42) });
    board.open(Math.floor(preset.rows / 2), Math.floor(preset.cols / 2));
    assert.equal(board.generated, true);
    assert.equal(mineCells(board).length, preset.mines);
    assert.equal(board.getCell(Math.floor(preset.rows / 2), Math.floor(preset.cols / 2)).isMine, false);
    const corners = [board.getCell(0, 0), board.getCell(0, preset.cols - 1), board.getCell(preset.rows - 1, 0), board.getCell(preset.rows - 1, preset.cols - 1)];
    assert.equal(corners.every(cell => !cell.isMine), true);
  }
});

test('opening a corner first keeps it safe and still places all mines', () => {
  const board = new MinesweeperBoard({ ...DIFFICULTIES.easy, rng: seededRng(7) });
  board.open(0, 0);
  assert.equal(board.getCell(0, 0).isMine, false);
  assert.equal(mineCells(board).length, DIFFICULTIES.easy.mines);
});

test('adjacent mine counts match generated neighbors including around safe corners', () => {
  const board = new MinesweeperBoard({ ...DIFFICULTIES.medium, rng: seededRng(9) });
  board.open(8, 8);
  for (const cell of board.cells.flat()) {
    assert.equal(cell.adjacentMines, board.neighbors(cell.row, cell.col).filter(n => n.isMine).length);
  }
});

test('flag toggling works before generation and flagged cells cannot open', () => {
  const board = new MinesweeperBoard(DIFFICULTIES.easy);
  const placed = board.toggleFlag(1, 1);
  assert.deepEqual(placed.flagged, [{ row: 1, col: 1 }]);
  assert.equal(board.flagCount, 1);
  assert.equal(board.open(1, 1).changed, false);
  assert.equal(board.generated, false);
  const removed = board.toggleFlag(1, 1);
  assert.deepEqual(removed.unflagged, [{ row: 1, col: 1 }]);
  assert.equal(board.flagCount, 0);
});

test('opened cells cannot be flagged', () => {
  const board = boardFromMines(3, 3, [[2, 2]]);
  board.open(0, 0);
  assert.equal(board.toggleFlag(0, 0).changed, false);
});

test('opening a zero cell flood-reveals safe region and numbered boundary', () => {
  const board = boardFromMines(4, 4, [[3, 3]]);
  const result = board.open(0, 0);
  assert.equal(result.opened.length, 15);
  assert.equal(result.opened.some(({ row, col }) => row === 2 && col === 2), true);
  assert.equal(result.opened.every(({ row, col }) => !board.getCell(row, col).isMine), true);
  assert.equal(board.outcome, 'won');
});

test('opening a mine loses and reports exploded coordinate', () => {
  const board = boardFromMines(3, 3, [[1, 1]]);
  const result = board.open(1, 1);
  assert.equal(board.outcome, 'lost');
  assert.deepEqual(result.exploded, { row: 1, col: 1 });
  assert.equal(board.getCell(1, 1).isOpen, true);
});

test('opening every safe cell wins', () => {
  const board = boardFromMines(3, 3, [[1, 1], [2, 2]]);
  for (const cell of board.cells.flat()) if (!cell.isMine) board.open(cell.row, cell.col);
  assert.equal(board.outcome, 'won');
  assert.equal(board.openedSafeCount, board.safeCellCount);
});

test('chord is a no-op when adjacent flag count does not match number', () => {
  const board = boardFromMines(3, 3, [[0, 0]]);
  board.getCell(1, 1).isOpen = true;
  board.openedSafeCount = 1;
  assert.equal(board.chord(1, 1).changed, false);
});

test('chord opens adjacent unflagged safe cells when flag count matches number', () => {
  const board = boardFromMines(3, 3, [[0, 0]]);
  board.getCell(1, 1).isOpen = true;
  board.openedSafeCount = 1;
  board.toggleFlag(0, 0);
  const result = board.chord(1, 1);
  assert.equal(result.changed, true);
  assert.equal(board.getCell(0, 1).isOpen, true);
  assert.equal(board.getCell(1, 0).isOpen, true);
  assert.equal(board.getCell(0, 0).isOpen, false);
});

test('incorrect flags can make chord expose an unflagged mine and lose', () => {
  const board = boardFromMines(3, 3, [[0, 0], [0, 2]]);
  board.getCell(1, 1).isOpen = true;
  board.openedSafeCount = 1;
  board.toggleFlag(2, 0);
  board.toggleFlag(2, 2);
  const result = board.chord(1, 1);
  assert.equal(board.outcome, 'lost');
  assert.ok(result.exploded);
});

test('gameplay input is ignored after win or loss', () => {
  const lost = boardFromMines(3, 3, [[1, 1]]);
  lost.open(1, 1);
  assert.equal(lost.toggleFlag(0, 0).changed, false);
  assert.equal(lost.open(0, 0).changed, false);
  const won = boardFromMines(2, 3, [[1, 1]]);
  for (const cell of won.cells.flat()) if (!cell.isMine) won.open(cell.row, cell.col);
  assert.equal(won.outcome, 'won');
  assert.equal(won.toggleFlag(1, 1).changed, false);
});

test('snapshot returns detached cell objects', () => {
  const board = new MinesweeperBoard(DIFFICULTIES.easy);
  const snap = board.snapshot();
  snap[0][0].isFlagged = true;
  assert.equal(board.getCell(0, 0).isFlagged, false);
});
