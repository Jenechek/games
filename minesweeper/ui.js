import {
  animateReveal,
  animateFlagIn,
  animateFlagOut,
  animateImpact,
  pulseMascot,
} from './animations.js';

const keyOf = (row, col) => `${row}:${col}`;

export class MinesweeperUI {
  constructor({ onOpen, onFlag, onChord, onRestart, onDifficulty, onPressState }) {
    this.onOpen = onOpen;
    this.onFlag = onFlag;
    this.onChord = onChord;
    this.onRestart = onRestart;
    this.onDifficulty = onDifficulty;
    this.onPressState = onPressState;
    this.boardElement = document.getElementById('board');
    this.boardFrame = this.boardElement.closest('.board-frame');
    this.mineCountElement = document.getElementById('mineCount');
    this.timerElement = document.getElementById('timer');
    this.mascotButton = document.getElementById('mascotButton');
    this.mascotElement = document.getElementById('mascot');
    this.statusText = document.getElementById('statusText');
    this.difficultyElement = document.getElementById('difficulty');
    this.cells = new Map();
    this.currentCols = 16;
    this.bindEvents();
  }

  bindEvents() {
    this.boardElement.addEventListener('click', event => {
      const element = event.target.closest('.cell');
      if (!element || !this.boardElement.contains(element)) return;
      const row = Number(element.dataset.row);
      const col = Number(element.dataset.col);
      if (element.classList.contains('open')) this.onChord(row, col);
      else this.onOpen(row, col);
    });

    this.boardElement.addEventListener('contextmenu', event => {
      const element = event.target.closest('.cell');
      if (!element || !this.boardElement.contains(element)) return;
      event.preventDefault();
      this.onFlag(Number(element.dataset.row), Number(element.dataset.col));
    });

    this.boardElement.addEventListener('pointerdown', event => {
      const element = event.target.closest('.cell');
      if (!element || element.classList.contains('open')) return;
      this.onPressState(true);
    });

    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      this.boardElement.addEventListener(type, () => this.onPressState(false));
    }

    this.mascotButton.addEventListener('click', this.onRestart);
    this.difficultyElement.addEventListener('click', event => {
      const button = event.target.closest('[data-difficulty]');
      if (!button) return;
      this.onDifficulty(button.dataset.difficulty);
    });
    window.addEventListener('resize', () => this.fitBoard(this.currentCols), { passive: true });
  }

  buildBoard(board) {
    this.cells.clear();
    this.boardElement.replaceChildren();
    this.currentCols = board.cols;
    this.boardElement.style.setProperty('--cols', board.cols);
    this.boardElement.setAttribute('aria-rowcount', String(board.rows));
    this.boardElement.setAttribute('aria-colcount', String(board.cols));
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cell';
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute('role', 'gridcell');
        button.setAttribute('aria-rowindex', String(row + 1));
        button.setAttribute('aria-colindex', String(col + 1));
        button.setAttribute('aria-label', 'Закрытая клетка');
        this.cells.set(keyOf(row, col), button);
        fragment.append(button);
      }
    }
    this.boardElement.append(fragment);
    this.fitBoard(board.cols);
  }

  fitBoard(cols) {
    const viewportPadding = window.innerWidth <= 760 ? 44 : 96;
    const available = Math.max(260, Math.min(980, window.innerWidth - viewportPadding));
    const preferred = cols <= 8 ? 42 : cols <= 16 ? 32 : 28;
    const fitted = Math.floor((available - 28) / cols);
    const cellSize = Math.max(10, Math.min(preferred, fitted));
    this.boardElement.style.setProperty('--cell-size', `${cellSize}px`);
    this.boardFrame.style.setProperty('--board-width', `${cellSize * cols}px`);
  }

  cellElement({ row, col }) {
    return this.cells.get(keyOf(row, col));
  }

  renderCell(cell, element, outcome, exploded) {
    if (!element) return;
    const isExploded = exploded && exploded.row === cell.row && exploded.col === cell.col;
    const revealMine = outcome === 'lost' && cell.isMine;
    const wrongFlag = outcome === 'lost' && cell.isFlagged && !cell.isMine;
    element.classList.toggle('open', cell.isOpen || revealMine);
    element.classList.toggle('flagged', cell.isFlagged && !revealMine && !wrongFlag);
    element.classList.toggle('mine', revealMine || (cell.isOpen && cell.isMine));
    element.classList.toggle('exploded', Boolean(isExploded));
    element.classList.toggle('wrong-flag', wrongFlag);
    for (let n = 1; n <= 8; n += 1) element.classList.remove(`n${n}`);
    element.textContent = '';
    if ((cell.isOpen || revealMine) && !cell.isMine && cell.adjacentMines > 0) {
      element.textContent = String(cell.adjacentMines);
      element.classList.add(`n${cell.adjacentMines}`);
    }
    if (isExploded) element.setAttribute('aria-label', 'Взорванная мина');
    else if (revealMine) element.setAttribute('aria-label', 'Мина');
    else if (wrongFlag) element.setAttribute('aria-label', 'Неверный флаг');
    else if (cell.isFlagged) element.setAttribute('aria-label', 'Флаг');
    else if (cell.isOpen && cell.adjacentMines > 0) element.setAttribute('aria-label', `Открыто: ${cell.adjacentMines}`);
    else if (cell.isOpen) element.setAttribute('aria-label', 'Открытая пустая клетка');
    else element.setAttribute('aria-label', 'Закрытая клетка');
  }

  renderBoard(board, result = null) {
    const exploded = result?.exploded || null;
    for (const cell of board.cells.flat()) this.renderCell(cell, this.cellElement(cell), board.outcome, exploded);
    if (!result) return;
    result.opened.forEach((position, index) => animateReveal(this.cellElement(position), Math.min(index * 7, 110)));
    result.flagged.forEach(position => animateFlagIn(this.cellElement(position)));
    result.unflagged.forEach(position => animateFlagOut(this.cellElement(position)));
    if (result.exploded) animateImpact(this.cellElement(result.exploded));
  }

  updateCounters({ minesLeft, seconds }) {
    this.mineCountElement.textContent = minesLeft;
    this.timerElement.textContent = seconds;
  }

  setDifficulty(key) {
    for (const button of this.difficultyElement.querySelectorAll('[data-difficulty]')) {
      const active = button.dataset.difficulty === key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  setMascot(state, caption) {
    this.mascotElement.dataset.state = state;
    this.statusText.textContent = caption;
    if (state === 'won') pulseMascot(this.mascotElement, 'won');
    else if (state === 'lost') pulseMascot(this.mascotElement, 'lost');
    else if (state === 'alert') pulseMascot(this.mascotElement, 'alert');
  }
}
