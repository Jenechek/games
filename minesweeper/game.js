import { DIFFICULTIES, MinesweeperBoard } from './board.js';
import { MinesweeperUI } from './ui.js';

const formatCounter = value => {
  const bounded = Math.max(-99, Math.min(999, value));
  if (bounded < 0) return `-${String(Math.abs(bounded)).padStart(2, '0')}`;
  return String(bounded).padStart(3, '0');
};

let difficultyKey = 'medium';
let board = null;
let seconds = 0;
let timerId = null;

const ui = new MinesweeperUI({
  onOpen: handleOpen,
  onFlag: handleFlag,
  onChord: handleChord,
  onRestart: () => startGame(difficultyKey),
  onDifficulty: key => startGame(key),
  onPressState: handlePressState,
});

function startTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    seconds = Math.min(999, seconds + 1);
    updateCounters();
    if (seconds >= 999) stopTimer();
  }, 1000);
}

function stopTimer() {
  if (timerId === null) return;
  window.clearInterval(timerId);
  timerId = null;
}

function updateCounters() {
  ui.updateCounters({
    minesLeft: formatCounter(board.mineCount - board.flagCount),
    seconds: formatCounter(seconds),
  });
}

function applyResult(result) {
  ui.renderBoard(board, result);
  updateCounters();
  if (board.outcome === 'won') {
    stopTimer();
    ui.setMascot('won', 'Ты победил!');
  } else if (board.outcome === 'lost') {
    stopTimer();
    ui.setMascot('lost', 'Вы проиграли');
  }
}

function handleOpen(row, col) {
  const wasGenerated = board.generated;
  const result = board.open(row, col);
  if (!result.changed) return;
  if (!wasGenerated && board.generated) startTimer();
  applyResult(result);
}

function handleFlag(row, col) {
  const result = board.toggleFlag(row, col);
  if (!result.changed) return;
  applyResult(result);
}

function handleChord(row, col) {
  const result = board.chord(row, col);
  if (!result.changed) return;
  applyResult(result);
}

function handlePressState(active) {
  if (!board || board.outcome === 'won' || board.outcome === 'lost') return;
  if (active) ui.setMascot('alert', 'Осторожно…');
  else ui.setMascot('idle', 'Новая игра');
}

function startGame(key) {
  if (!DIFFICULTIES[key]) return;
  stopTimer();
  difficultyKey = key;
  seconds = 0;
  board = new MinesweeperBoard(DIFFICULTIES[key]);
  ui.setDifficulty(key);
  ui.buildBoard(board);
  ui.renderBoard(board);
  ui.setMascot('idle', 'Новая игра');
  updateCounters();
}

startGame('medium');
