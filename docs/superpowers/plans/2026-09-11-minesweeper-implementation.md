# Browser Minesweeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone browser Minesweeper game in `minesweeper/` with classic difficulty presets and controls, protected first/corner clicks, animated board interactions, and the approved animated sapper mascot.

**Architecture:** Keep game rules in a pure ES module (`board.js`) that owns all board state and can be tested without a DOM. `game.js` coordinates lifecycle and timer state, `ui.js` owns DOM rendering/bindings, and `animations.js` only applies semantic animation classes. The page remains a static GitHub Pages app with no runtime dependencies.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript ES modules, Node.js built-in `node:test` + `assert` for logic tests, existing GitHub Pages workflow.

**Spec:** `docs/superpowers/specs/2026-09-11-minesweeper-design.md`

## Global Constraints

- No external runtime libraries.
- Difficulty dimensions are columns × rows.
- Easy: 8×8 with 10 mines.
- Medium: 16×16 with 40 mines.
- Hard: 30×16 with 99 mines.
- First opened cell is always safe.
- All four corner cells are always mine-free but otherwise behave like ordinary cells and have no special visual marker.
- No guarantee that a generated board is solvable without guessing.
- Classic desktop controls: left click opens, right click toggles flag, left click on an opened number performs chord when adjacent flag count matches.
- Timer starts on first successful opening and stops on win/loss.
- Mine counter equals configured mines minus current flags and may be negative.
- Distinct animations are required for reveal, flag placement, flag removal, and mine explosion.
- Mascot states: idle, press/alert, loss, win, with short non-blocking animation.
- Root `index.html` must link to both Snake and Minesweeper.
- GitHub Pages deployment must continue to use the existing `.github/workflows/pages.yml` without new deployment dependencies.

---

## File Map

- Create `minesweeper/package.json` — isolates ESM test configuration and exposes `npm test`.
- Create `minesweeper/board.js` — pure board rules/state, no DOM.
- Create `minesweeper/board.test.js` — automated board-logic tests.
- Create `minesweeper/index.html` — semantic page shell and status/board containers.
- Create `minesweeper/minesweeper.css` — full dark UI, responsive board, mascot art, animations.
- Create `minesweeper/animations.js` — semantic CSS animation helpers.
- Create `minesweeper/ui.js` — DOM construction, render, interaction bindings.
- Create `minesweeper/game.js` — lifecycle/timer coordinator.
- Modify root `index.html` — add Minesweeper collection card.

---

### Task 1: Pure board engine and presets

**Files:**
- Create: `minesweeper/package.json`
- Create: `minesweeper/board.test.js`
- Create: `minesweeper/board.js`

**Interfaces:**
- Produces `DIFFICULTIES` with `{ easy, medium, hard }` preset objects.
- Produces `class MinesweeperBoard` with constructor `new MinesweeperBoard({ cols, rows, mines, rng = Math.random })`.
- Public methods: `open(row, col)`, `toggleFlag(row, col)`, `chord(row, col)`, `getCell(row, col)`, `neighbors(row, col)`, `snapshot()`.
- Public getters/state: `generated`, `outcome`, `flagCount`, `openedSafeCount`, `safeCellCount`.
- Action methods return result objects with `{ changed, opened, flagged, unflagged, exploded, outcome }` so UI can animate exact cells.

- [ ] **Step 1: Add isolated Node ESM test configuration**

Create `minesweeper/package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test board.test.js"
  }
}
```

- [ ] **Step 2: Write failing preset and construction tests**

Create `minesweeper/board.test.js` with imports and initial tests:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, MinesweeperBoard } from './board.js';

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
});
```

- [ ] **Step 3: Run test and verify RED**

Run from `minesweeper/`:

```bash
npm test
```

Expected: FAIL because `board.js` and exports do not exist yet.

- [ ] **Step 4: Implement presets, cell model, bounds, and neighbor enumeration**

Create `minesweeper/board.js` with:

```js
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ cols: 8, rows: 8, mines: 10, label: 'Лёгкий' }),
  medium: Object.freeze({ cols: 16, rows: 16, mines: 40, label: 'Средний' }),
  hard: Object.freeze({ cols: 30, rows: 16, mines: 99, label: 'Сложный' }),
});

const makeCell = (row, col) => ({
  row,
  col,
  isMine: false,
  adjacentMines: 0,
  isOpen: false,
  isFlagged: false,
});

export class MinesweeperBoard {
  constructor({ cols, rows, mines, rng = Math.random }) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2) {
      throw new RangeError('Board dimensions must be integers >= 2');
    }
    if (!Number.isInteger(mines) || mines < 1 || mines >= cols * rows - 4) {
      throw new RangeError('Invalid mine count');
    }
    this.cols = cols;
    this.rows = rows;
    this.mineCount = mines;
    this.rng = rng;
    this.generated = false;
    this.outcome = 'ready';
    this.flagCount = 0;
    this.openedSafeCount = 0;
    this.cells = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => makeCell(row, col))
    );
  }

  get safeCellCount() {
    return this.cols * this.rows - this.mineCount;
  }

  inBounds(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getCell(row, col) {
    if (!this.inBounds(row, col)) return null;
    return this.cells[row][col];
  }

  neighbors(row, col) {
    const result = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const next = this.getCell(row + dr, col + dc);
        if (next) result.push(next);
      }
    }
    return result;
  }

  snapshot() {
    return this.cells.map(row => row.map(cell => ({ ...cell })));
  }
}
```

- [ ] **Step 5: Run test and verify GREEN**

Run `npm test`.
Expected: 2 tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add minesweeper/package.json minesweeper/board.js minesweeper/board.test.js
git commit -m "feat: add Minesweeper board foundation"
```

---

### Task 2: Mine generation, protected cells, numbers, opening, flags, and outcomes

**Files:**
- Modify: `minesweeper/board.test.js`
- Modify: `minesweeper/board.js`

**Interfaces:**
- Consumes Task 1 `MinesweeperBoard`.
- `open(row, col)` lazily generates mines on first successful open.
- `toggleFlag(row, col)` returns a result with `flagged` or `unflagged` coordinate arrays.
- `chord(row, col)` shares the same result format as `open`.
- Result coordinates use `{ row, col }` objects.

- [ ] **Step 1: Add failing tests for first-click safety, four protected corners, exact mine count, and neighbor counts**

Add deterministic helper:

```js
const zeroRng = () => 0;
const mineCells = board => board.cells.flat().filter(cell => cell.isMine);
const cornerCoords = board => [
  [0, 0],
  [0, board.cols - 1],
  [board.rows - 1, 0],
  [board.rows - 1, board.cols - 1],
];
```

Add tests asserting after `board.open(3, 3)`:

```js
assert.equal(board.generated, true);
assert.equal(board.getCell(3, 3).isMine, false);
assert.equal(mineCells(board).length, 10);
for (const [row, col] of cornerCoords(board)) {
  assert.equal(board.getCell(row, col).isMine, false);
}
for (const cell of board.cells.flat()) {
  const expected = board.neighbors(cell.row, cell.col).filter(n => n.isMine).length;
  assert.equal(cell.adjacentMines, expected);
}
```

Also add a dedicated test that first opening a corner keeps that corner safe while still placing the full configured mine count.

- [ ] **Step 2: Run test and verify RED**

Run `npm test`.
Expected: FAIL because `open()` and mine generation are not implemented.

- [ ] **Step 3: Implement lazy mine generation and adjacent numbers**

Add internal helpers in `board.js`:

```js
isCorner(row, col) {
  return (row === 0 || row === this.rows - 1) && (col === 0 || col === this.cols - 1);
}

placeMines(firstRow, firstCol) {
  const eligible = this.cells.flat().filter(cell =>
    !this.isCorner(cell.row, cell.col) &&
    !(cell.row === firstRow && cell.col === firstCol)
  );
  if (eligible.length < this.mineCount) throw new RangeError('Not enough eligible mine cells');

  for (let i = eligible.length - 1; i > 0; i -= 1) {
    const j = Math.floor(this.rng() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  for (const cell of eligible.slice(0, this.mineCount)) cell.isMine = true;

  for (const cell of this.cells.flat()) {
    cell.adjacentMines = this.neighbors(cell.row, cell.col).filter(n => n.isMine).length;
  }
  this.generated = true;
  this.outcome = 'playing';
}
```

- [ ] **Step 4: Add failing tests for flags, flagged-cell blocking, flood reveal, loss, and win**

Add tests that verify:

```js
const flagged = board.toggleFlag(1, 1);
assert.deepEqual(flagged.flagged, [{ row: 1, col: 1 }]);
assert.equal(board.flagCount, 1);
assert.equal(board.open(1, 1).changed, false);
const unflagged = board.toggleFlag(1, 1);
assert.deepEqual(unflagged.unflagged, [{ row: 1, col: 1 }]);
assert.equal(board.flagCount, 0);
```

Create a board with a deterministic RNG, open a known zero, and assert every returned `opened` coordinate is safe and includes at least one boundary number. Add a loss test by generating, locating a mine from test-visible board state, and opening it. Add a win test by opening every non-mine cell after generation and asserting `outcome === 'won'`.

- [ ] **Step 5: Run test and verify RED**

Run `npm test`.
Expected: new flag/open/outcome tests FAIL.

- [ ] **Step 6: Implement action result helper, flag toggle, flood reveal, open, loss, and win**

Use result shape:

```js
makeResult() {
  return {
    changed: false,
    opened: [],
    flagged: [],
    unflagged: [],
    exploded: null,
    outcome: this.outcome,
  };
}
```

Implement queue-based safe reveal to avoid recursion depth issues. Each newly opened safe cell increments `openedSafeCount`; zero cells enqueue adjacent closed unflagged safe cells. After each opening batch, if `openedSafeCount === safeCellCount`, set `outcome = 'won'`.

`open(row, col)` must:
- no-op for invalid, open, flagged, won, or lost cells;
- call `placeMines()` before first reveal;
- if mine: mark the cell open, set `outcome = 'lost'`, return `exploded` coordinate;
- otherwise reveal the safe region and evaluate win.

- [ ] **Step 7: Add failing chord tests**

Add one test where adjacent flag count differs and assert `changed === false`. Add one where flags equal the number and safe unflagged neighbors open. Add one with an incorrect flag arrangement causing the chord to expose an unflagged mine and assert loss.

- [ ] **Step 8: Run test and verify RED**

Run `npm test`.
Expected: chord tests FAIL.

- [ ] **Step 9: Implement `chord(row, col)`**

Implementation rules:

```js
chord(row, col) {
  const result = this.makeResult();
  if (this.outcome !== 'playing') return result;
  const cell = this.getCell(row, col);
  if (!cell?.isOpen || cell.adjacentMines === 0) return result;
  const around = this.neighbors(row, col);
  const flags = around.filter(n => n.isFlagged).length;
  if (flags !== cell.adjacentMines) return result;
  for (const next of around.filter(n => !n.isOpen && !n.isFlagged)) {
    const child = this.open(next.row, next.col);
    mergeResult(result, child);
    if (this.outcome === 'lost') break;
  }
  result.changed = result.opened.length > 0 || Boolean(result.exploded);
  result.outcome = this.outcome;
  return result;
}
```

Use an internal `mergeResult(target, source)` helper so coordinate arrays and `exploded` propagate without duplication.

- [ ] **Step 10: Run full board tests and verify GREEN**

Run `npm test`.
Expected: all board tests PASS with zero failures.

- [ ] **Step 11: Commit Task 2**

```bash
git add minesweeper/board.js minesweeper/board.test.js
git commit -m "feat: implement Minesweeper rules"
```

---

### Task 3: Static UI shell, approved dark theme, responsive board, and mascot art

**Files:**
- Create: `minesweeper/index.html`
- Create: `minesweeper/minesweeper.css`

**Interfaces:**
- HTML IDs consumed later: `difficulty`, `mineCount`, `timer`, `mascotButton`, `mascot`, `statusText`, `board`.
- Difficulty buttons use `data-difficulty="easy|medium|hard"`.
- Board receives CSS custom properties `--cols` and `--cell-size` from `ui.js`.
- Mascot state is controlled with `data-state="idle|alert|lost|won"` on `#mascot`.

- [ ] **Step 1: Create semantic page shell**

Create `minesweeper/index.html` with:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Сапёр</title>
  <link rel="stylesheet" href="minesweeper.css">
</head>
<body>
  <main class="shell">
    <section class="game-card" aria-label="Игра Сапёр">
      <header class="hero">
        <p class="eyebrow">ЛОГИКА • ТЕРПЕНИЕ • ПОБЕДА</p>
        <h1>Сапёр</h1>
      </header>

      <nav id="difficulty" class="difficulty" aria-label="Сложность">
        <button type="button" data-difficulty="easy">Лёгкий</button>
        <button type="button" data-difficulty="medium" class="active">Средний</button>
        <button type="button" data-difficulty="hard">Сложный</button>
      </nav>

      <section class="status-panel" aria-label="Статус игры">
        <div class="counter-block">
          <span>МИНЫ</span>
          <strong id="mineCount" class="digital">040</strong>
        </div>

        <button id="mascotButton" class="mascot-button" type="button" aria-label="Новая игра">
          <span id="mascot" class="mascot" data-state="idle" aria-hidden="true">
            <span class="helmet"><span class="shield"></span></span>
            <span class="face"><span class="eye eye-left"></span><span class="eye eye-right"></span><span class="mouth"></span></span>
          </span>
          <span id="statusText" class="mascot-caption">Новая игра</span>
        </button>

        <div class="counter-block">
          <span>ВРЕМЯ</span>
          <strong id="timer" class="digital">000</strong>
        </div>
      </section>

      <div class="board-frame">
        <div id="board" class="board" role="grid" aria-label="Минное поле"></div>
      </div>

      <p class="footer-copy">ОДНО ПОЛЕ БЛИЖЕ К ПОБЕДЕ</p>
    </section>
  </main>
  <script type="module" src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement the approved visual direction in CSS**

`minesweeper.css` must define:
- full-page dark navy/charcoal radial background;
- centered rounded `game-card` with max desktop width sized for the 30×16 board;
- large metallic-light title, green active difficulty treatment;
- red seven-segment-inspired `.digital` typography using system monospace fallback;
- grid board with `grid-template-columns: repeat(var(--cols), var(--cell-size));`;
- square `.cell` tiles with raised closed state and inset open state;
- number color classes `.n1`…`.n8`;
- red CSS flag made from pseudo-elements or text-safe inline shape;
- CSS-drawn mascot matching approved green helmet + white shield + simple face proportions;
- states `#mascot[data-state="alert"]`, `lost`, `won` changing only face expression/accent motion;
- responsive rules so 30 columns fit viewport while remaining square.

Use cell sizing contract:

```css
.board {
  --cell-size: 30px;
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell-size));
  grid-auto-rows: var(--cell-size);
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
}
```

For responsive hard mode use container scaling through a computed `--cell-size` supplied by JS rather than non-square CSS stretching.

- [ ] **Step 3: Add mascot keyframes**

Define:

```css
@keyframes mascot-breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes mascot-alert { 0%{transform:scale(1)} 45%{transform:scale(1.08)} 100%{transform:scale(1)} }
@keyframes mascot-slump { from{transform:translateY(0)} to{transform:translateY(4px)} }
@keyframes mascot-win { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} 70%{transform:translateY(1px)} }
```

Apply them by state without delaying game actions.

- [ ] **Step 4: Manual static inspection**

Open `minesweeper/index.html` through a static server and confirm:
- layout resembles approved mockup;
- all three difficulty buttons, counters, mascot, board frame exist;
- no corner cell marker is hard-coded;
- small viewport keeps the card usable.

- [ ] **Step 5: Commit Task 3**

```bash
git add minesweeper/index.html minesweeper/minesweeper.css
git commit -m "feat: add Minesweeper interface"
```

---

### Task 4: Animation helper and DOM renderer

**Files:**
- Create: `minesweeper/animations.js`
- Create: `minesweeper/ui.js`
- Modify: `minesweeper/minesweeper.css`

**Interfaces:**
- `animations.js` exports `animateReveal(element, delayMs = 0)`, `animateFlagIn(element)`, `animateFlagOut(element)`, `animateExplosion(element)`, `pulseMascot(element, state)`.
- `ui.js` exports `class MinesweeperUI`.
- Constructor accepts callbacks `{ onOpen, onFlag, onChord, onRestart, onDifficulty, onPressState }`.
- Methods: `buildBoard(board)`, `renderBoard(board, result)`, `updateCounters({ minesLeft, seconds })`, `setDifficulty(key)`, `setMascot(state, caption)`, `fitBoard(cols)`.

- [ ] **Step 1: Implement animation helper functions**

Create `animations.js` around a shared retrigger helper:

```js
const retrigger = (element, className, delayMs = 0) => {
  if (!element) return;
  window.setTimeout(() => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
  }, delayMs);
};

export const animateReveal = (el, delay = 0) => retrigger(el, 'anim-reveal', delay);
export const animateFlagIn = el => retrigger(el, 'anim-flag-in');
export const animateFlagOut = el => retrigger(el, 'anim-flag-out');
export const animateExplosion = el => retrigger(el, 'anim-explosion');
export const pulseMascot = (el, state) => retrigger(el, `anim-mascot-${state}`);
```

- [ ] **Step 2: Add distinct board animation keyframes**

Add CSS classes:
- `.anim-reveal`: quick scale/press then settle into open state;
- `.anim-flag-in`: flag pop upward from scale .5/opacity 0;
- `.anim-flag-out`: reverse shrink/fade;
- `.anim-explosion`: red local flash plus 2–3px shake;
- respect `@media (prefers-reduced-motion: reduce)` by reducing durations to near-zero while preserving state changes.

- [ ] **Step 3: Implement board DOM construction and cell rendering in `ui.js`**

Each cell button must have:

```html
<button class="cell" type="button" role="gridcell" data-row="0" data-col="0" aria-label="Закрытая клетка"></button>
```

`buildBoard(board)` rebuilds exactly `rows * cols` buttons, sets `--cols`, and calls `fitBoard(cols)`.

`renderCell(cell, element)` must:
- toggle `.open`, `.flagged`, `.mine`, `.exploded` classes;
- use text only for open non-zero numbers;
- apply `.n1`…`.n8`;
- render flags via class/pseudo-element, not Unicode dependency;
- use `💣` only as fallback mine content if CSS mine drawing is unavailable; preferred implementation is a CSS mine pseudo-element;
- set accessible labels reflecting state.

- [ ] **Step 4: Bind pointer and context-menu interactions**

Board event delegation:
- `click` on closed cell -> `onOpen(row,col)`;
- `click` on open numbered cell -> `onChord(row,col)`;
- `contextmenu` on a board cell only -> prevent default and `onFlag(row,col)`;
- `pointerdown` on a closed cell -> `onPressState(true)`;
- `pointerup`, `pointercancel`, `pointerleave` -> `onPressState(false)`.

Difficulty buttons and mascot button call their respective callbacks.

- [ ] **Step 5: Render action-specific animation results**

`renderBoard(board, result)` uses result arrays:

```js
result.opened.forEach((coord, index) => animateReveal(cellElement(coord), Math.min(index * 8, 120)));
result.flagged.forEach(coord => animateFlagIn(cellElement(coord)));
result.unflagged.forEach(coord => animateFlagOut(cellElement(coord)));
if (result.exploded) animateExplosion(cellElement(result.exploded));
```

For loss, render all mines after the explosion state is applied; only the triggered cell receives `.exploded`.

- [ ] **Step 6: Commit Task 4**

```bash
git add minesweeper/animations.js minesweeper/ui.js minesweeper/minesweeper.css
git commit -m "feat: add Minesweeper rendering and animations"
```

---

### Task 5: Game coordinator, timer, difficulty switching, mascot lifecycle

**Files:**
- Create: `minesweeper/game.js`

**Interfaces:**
- Consumes `DIFFICULTIES`, `MinesweeperBoard`, and `MinesweeperUI`.
- Coordinator state: `difficultyKey`, `board`, `seconds`, `timerId`.
- Functions: `startGame(key)`, `handleOpen(row,col)`, `handleFlag(row,col)`, `handleChord(row,col)`, `applyResult(result)`, `startTimer()`, `stopTimer()`, `formatCounter(value)`.

- [ ] **Step 1: Implement lifecycle and timer helpers**

Use:

```js
const formatCounter = value => {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.min(999, Math.abs(value))).padStart(sign ? 2 : 3, '0');
  return `${sign}${digits}`;
};
```

`startTimer()` creates one 1-second interval only when none exists. `stopTimer()` clears and nulls it. `startGame(key)` always stops the prior timer, resets seconds to 0, constructs a fresh board from the selected preset, rebuilds UI, updates counters, selects difficulty, and sets mascot idle.

- [ ] **Step 2: Wire open/flag/chord actions**

`handleOpen` records whether board was ungenerated before action; after `board.open()`, if this was the first successful opening and outcome is playing, start timer. Then call `applyResult`.

`handleFlag` calls `toggleFlag`, renders, and updates mine counter without starting timer.

`handleChord` calls `chord` and applies the result.

- [ ] **Step 3: Implement result-to-lifecycle mapping**

`applyResult(result)` must:
- call `ui.renderBoard(board, result)`;
- update mine count from `board.mineCount - board.flagCount`;
- on `won`: stop timer, set mascot `won`, caption `Ты победил!`;
- on `lost`: stop timer, set mascot `lost`, caption `Вы проиграли`;
- otherwise keep mascot idle after pointer release.

- [ ] **Step 4: Implement alert mascot press behavior**

Pass `onPressState(active)` into `MinesweeperUI`. If board is not won/lost:
- active -> `ui.setMascot('alert', 'Осторожно…')`;
- inactive -> `ui.setMascot('idle', 'Новая игра')`.

Restart and difficulty changes immediately restore idle state.

- [ ] **Step 5: Bootstrap default Medium game**

At module load:

```js
const ui = new MinesweeperUI(callbacks);
startGame('medium');
```

Ensure counter starts at `040`, timer at `000`, mines are not generated until first open, and no timer interval runs before that action.

- [ ] **Step 6: Re-run board tests**

Run `npm test` from `minesweeper/`.
Expected: all board tests still PASS.

- [ ] **Step 7: Browser functional pass**

Verify manually:
- first open never explodes;
- each corner can be opened safely in fresh games;
- right-click flag/unflag animations differ;
- chord works with exact adjacent flag count;
- mine click shows distinct explosion and loss mascot;
- win state stops timer and shows win mascot;
- mascot click restarts current difficulty;
- switching difficulty rebuilds correct board dimensions and counter;
- Hard displays 30 columns × 16 rows with square cells.

- [ ] **Step 8: Commit Task 5**

```bash
git add minesweeper/game.js
git commit -m "feat: wire Minesweeper game lifecycle"
```

---

### Task 6: Collection integration and deployment verification

**Files:**
- Modify: `index.html`

**Interfaces:**
- Root collection links `./snake/` and `./minesweeper/`.
- Existing GitHub Pages workflow publishes the repository root unchanged.

- [ ] **Step 1: Add Minesweeper card to root collection page**

Add alongside Snake:

```html
<a class="card" href="./minesweeper/">
  <div class="title">Сапёр</div>
  <div>Классический Minesweeper с современным интерфейсом.</div>
  <span class="play">Играть →</span>
</a>
```

Do not remove or change the Snake destination.

- [ ] **Step 2: Run fresh automated verification**

From `minesweeper/` run:

```bash
npm test
```

Expected: all tests PASS, zero failures.

- [ ] **Step 3: Inspect final repository paths**

Confirm these exist:

```text
minesweeper/index.html
minesweeper/minesweeper.css
minesweeper/board.js
minesweeper/board.test.js
minesweeper/animations.js
minesweeper/ui.js
minesweeper/game.js
minesweeper/package.json
```

- [ ] **Step 4: Commit collection integration**

```bash
git add index.html
git commit -m "feat: add Minesweeper to game collection"
```

- [ ] **Step 5: Verify GitHub Pages deployment**

After push to `main`, inspect the newest `Deploy GitHub Pages` workflow run and require `status=completed` and `conclusion=success` for the latest head SHA.

Then verify the published paths:

```text
https://jenechek.github.io/games/
https://jenechek.github.io/games/minesweeper/
```

Acceptance requires the Minesweeper page to load its CSS and modules without 404s and the root card to navigate correctly.

---

## Plan Self-Review

- Spec coverage: every gameplay, protected-cell, timer/counter, mascot, animation, responsive UI, collection, test, and deployment requirement is assigned to a task.
- Placeholder scan: no TBD/TODO/"implement later" steps remain.
- Interface consistency: `MinesweeperBoard` result objects use the same coordinate/result contract consumed by `ui.js` and `game.js`; mascot states are consistently `idle|alert|lost|won`; difficulty keys are consistently `easy|medium|hard`.
- Scope: one static browser game plus one root collection link; no unrelated refactors or extra modes.
