# Browser Minesweeper — Design Specification

Date: 2026-09-11
Repository: `Jenechek/games`
Target folder: `minesweeper/`

## Goal

Add a second browser game, Minesweeper (`Сапёр`), alongside the existing Snake game. The game should preserve classic Minesweeper rules and controls while using a modern dark visual style based on the approved mockup: a central dark game panel, difficulty selector, digital mine counter and timer, and a helmeted sapper mascot used as the restart control.

## Difficulty presets

Use the classic Microsoft Minesweeper sizes and mine counts:

- Easy (`Лёгкий`): 8×8 board, 10 mines.
- Medium (`Средний`): 16×16 board, 40 mines.
- Hard (`Сложный`): 30×16 board, 99 mines.

Difficulty changes start a fresh game immediately.

## Core rules

- Mines are placed only after the first opening action so the first opened cell is always safe.
- The four extreme corner cells are always non-mine cells.
- Corner cells otherwise participate normally in the game: they can be opened, flagged, counted by neighboring numbers, and are part of the win condition.
- The board is not required to be solvable without guessing.
- A left click opens a closed, unflagged cell.
- A right click toggles a flag on a closed cell.
- Clicking an already opened numbered cell performs classic chord behavior: if the count of adjacent flags equals the cell number, all adjacent unflagged closed cells are opened.
- Opening a zero cell recursively reveals the connected zero region and its numbered boundary cells.
- The player wins when every non-mine cell is opened.
- Opening a mine ends the game immediately.
- After win or loss, the board no longer accepts gameplay input until restart or difficulty change.

## Mine generation

Mine generation must respect all protected cells:

1. The first opened cell is excluded from mine placement.
2. All four board corners are excluded from mine placement.
3. The configured mine count remains unchanged; excluded mines are redistributed among all other eligible cells.
4. If the first opened cell is itself a corner, it is still only one protected coordinate.

No additional safety radius around the first click is required.

## Timer and mine counter

- The timer starts on the first successful cell opening.
- The timer stops on win or loss.
- Display elapsed time in a compact digital style, capped visually at 999 seconds if needed.
- The mine counter shows configured mines minus currently placed flags and may become negative if the player places excess flags, matching classic behavior.
- Restart resets timer, flags, opened cells, generated mines, and mascot state while keeping the current difficulty.

## Visual direction

Use the approved mockup as the design reference.

Primary visual characteristics:

- Dark navy/charcoal background and central rounded game panel.
- Large `Сапёр` title with understated subtitle text.
- Three difficulty buttons near the top.
- Wide status panel with red digital mine counter on the left, mascot restart control in the center, and red digital timer on the right.
- Raised dark board tiles with lighter revealed tiles.
- Classic number color hierarchy: distinct colors for 1–8, with blue/green/red clearly preserved for 1/2/3.
- Red flags.
- Responsive layout that keeps the full board usable on desktop and smaller screens. The hard 30×16 board may scale its cells down to fit available width, but all cells remain square.
- Decorative background elements from the mockup may be simplified in implementation; gameplay clarity takes priority over decorative fidelity.

The new game should visually belong to the same overall site collection but does not need to reuse Snake-specific styles or assets.

## Mascot states and animation

The central restart control is a simple cartoon sapper face wearing the same green helmet with white shield emblem shown in the approved design. The character identity, proportions, palette, and helmet design remain consistent across states; only expression and small motion accents change.

Required states:

- Idle: calm eyes and friendly small smile.
- Press/alert: widened eyes and small open mouth while the player is actively pressing a board cell.
- Loss: drooped or worried eyes with a small frown.
- Win: broad joyful smile and celebratory expression.

Required motion:

- Idle: very subtle periodic bob or breathing movement.
- Press/alert: brief quick reaction when a board press begins, returning to idle when released unless the game ends.
- Loss: short downward settling/slump animation.
- Win: short bounce/celebration animation.
- Restart click: brief press feedback on the mascot button itself.

Animations must be short and non-blocking. They must not alter game timing or delay input handling.

## Board animations

Each board interaction receives a distinct animation:

### Cell reveal

- Short press-to-open/recess effect.
- Revealed content fades or pops in quickly.
- Flood-revealed cells may animate with a very small stagger for readability, but total delay must remain short and must not block input unnecessarily.

### Flag placement

- Flag scales/pops into place with a slight upward movement.
- The cell itself remains closed.

### Flag removal

- Flag quickly shrinks/fades out.
- Removal should feel visibly different from placement.

### Mine explosion

- The triggered mine cell receives a red flash/pulse and a short local shake or impact effect.
- The triggered mine is visually distinguished from other mines shown after loss.
- The effect remains family-friendly and contains no graphic imagery.

Animations should prefer CSS transitions/keyframes applied through state classes. JavaScript controls only state changes and sequencing.

## Architecture

Use a DOM/CSS implementation with no external runtime libraries.

Planned structure:

```text
minesweeper/
├─ index.html
├─ minesweeper.css
├─ game.js
├─ board.js
├─ ui.js
└─ animations.js
```

Responsibilities:

### `board.js`

Pure game-state and board logic:

- difficulty configuration
- board creation
- protected-cell handling
- mine placement
- neighbor counts
- cell reveal and zero flood-fill
- flag toggling
- chord logic
- win/loss detection
- state queries used by the UI

This module should contain no DOM manipulation.

### `game.js`

Game coordinator:

- owns current difficulty and current board instance
- starts/restarts games
- starts/stops timer
- routes UI actions into board logic
- converts board results into UI updates and animation requests
- controls game lifecycle (`ready`, `playing`, `won`, `lost`)

### `ui.js`

DOM rendering and interaction bindings:

- builds/rebuilds the board DOM
- renders cell state, numbers, mines, and flags
- updates counters and timer
- updates selected difficulty
- updates mascot expression
- binds left click, right click, chord actions, difficulty buttons, and restart control

### `animations.js`

Small animation helper layer:

- applies/removes semantic animation classes
- reveal animation
- flag in/out animation
- mine explosion animation
- mascot state transition helpers

The module should not own game state.

### `minesweeper.css`

All visual styling, responsive cell sizing, mascot drawing/styling, and keyframe animations.

### `index.html`

Semantic page shell, top controls, status bar, board container, and module/script loading.

## Data model

Each board cell should expose at least:

- row
- column
- `isMine`
- `adjacentMines`
- `isOpen`
- `isFlagged`

Board-level state should include:

- rows
- columns
- mine count
- generated/not-generated status
- current outcome
- opened safe-cell count
- flag count

The DOM is a view of this state, not the source of truth.

## Input behavior

Desktop:

- Left mouse button: open cell.
- Right mouse button: toggle flag; browser context menu is suppressed only on board cells.
- Left click on an opened number: chord when adjacent flag count matches the number.
- Mascot click: restart current difficulty.
- Difficulty button: restart with selected preset.

Touch/pointer support should use the same DOM cell model. Basic tapping opens a cell. A long-press or equivalent touch flag interaction may be added only if it can be implemented clearly without compromising the desktop behavior; desktop mouse behavior is the required baseline for the first version.

## Main collection page

Update the repository root `index.html` to add a second game card linking to `./minesweeper/`, while preserving the existing Snake card.

## Error and edge-case handling

- Prevent opening flagged cells.
- Prevent flag toggling on opened cells.
- Ignore gameplay input after win/loss.
- Ensure generated mine count exactly matches the selected preset.
- Ensure none of the four corners ever contains a mine.
- Ensure the first opened cell never contains a mine.
- Chord opens only when adjacent flag count exactly equals the opened number.
- If chord exposes an incorrectly unflagged mine, normal loss behavior applies.
- Recursive zero reveal must not recurse indefinitely or reopen cells.
- Restart and difficulty changes must fully cancel/reset prior timer state.

## Testing strategy

Implementation should be test-driven for game logic.

Minimum automated coverage:

- all three difficulty dimensions and mine counts
- exact mine count after generation
- first-click safety
- all four corners always safe
- corners still counted normally by adjacent cells
- flag placement/removal rules
- opening blocked on flagged cells
- zero-region flood reveal
- neighbor number correctness
- chord behavior when flag count matches
- chord no-op when flag count does not match
- loss when a mine is opened
- loss through an incorrect chord
- win detection when all safe cells are opened
- restart state reset

UI verification should additionally confirm:

- mine counter and timer updates
- difficulty switching
- mascot states for idle/press/loss/win
- reveal/flag/remove/explosion animation classes are triggered by the correct events
- board remains usable across all three board sizes

## Out of scope for first version

- Guaranteed no-guess boards.
- Custom board-size editor.
- Online leaderboards or accounts.
- Sound effects.
- Persistent statistics or achievements.
- Themes beyond the approved dark design.
- Additional game modes.

## Acceptance criteria

The feature is accepted when:

1. `minesweeper/` is available as a standalone browser game through GitHub Pages.
2. Easy, Medium, and Hard exactly match 8×8/10, 16×16/40, and 30×16/99.
3. First opened cell and all four corner cells are always mine-free.
4. Classic open, flag, unflag, and chord controls work correctly.
5. Timer, mine counter, restart, win, and loss states work correctly.
6. Reveal, flag placement, flag removal, and mine explosion each have visibly distinct animations.
7. The mascot keeps the approved design and has animated idle, alert, loss, and win states.
8. The visual style is recognizably based on the approved dark mockup.
9. The root games page links to both Snake and Minesweeper.
10. Automated board-logic tests pass and the GitHub Pages deployment succeeds.
