(() => {
  const COLS = 12;
  const ROWS = 10;
  const CELL_TRAVEL_MS = 281.25;
  const COLLISION_GRACE_MS = 400;
  const TRAIL_SAMPLE_SPACING = 0.075;
  const TRAIL_MEMORY = COLS * ROWS + 4;
  const { advanceSegment, appendTrailPoint, sampleTrail } = SnakeMotion;
  const { buildSmoothCenterline, buildRibbonPolygon } = SnakeRender;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const pauseButton = document.getElementById('pauseButton');
  const restartButton = document.getElementById('restartButton');
  const overlay = document.getElementById('overlay');
  const overlayKicker = document.getElementById('overlayKicker');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const overlayButton = document.getElementById('overlayButton');
  const controls = document.querySelectorAll('[data-dir]');

  const cellW = canvas.width / COLS;
  const cellH = canvas.height / ROWS;

  let game = new SnakeGame({ cols: COLS, rows: ROWS });
  let highScore = loadHighScore();
  let lastTime = performance.now();
  let touchStart = null;
  let headPosition = { ...game.snake[0] };
  let trail = game.snake.slice().reverse().map(part => ({ ...part }));
  let segment = null;
  let transitionFood = null;
  let collisionGraceElapsed = null;

  highScoreEl.textContent = highScore;

  function loadHighScore() {
    try {
      return Number(localStorage.getItem('snake-high-score') || 0);
    } catch {
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      localStorage.setItem('snake-high-score', String(value));
    } catch {
      // The game still works when localStorage is unavailable.
    }
  }

  function updateScore() {
    scoreEl.textContent = game.score;
    if (game.score > highScore) {
      highScore = game.score;
      highScoreEl.textContent = highScore;
      saveHighScore(highScore);
    }
  }

  function resetMotion() {
    headPosition = { ...game.snake[0] };
    trail = game.snake.slice().reverse().map(part => ({ ...part }));
    segment = null;
    transitionFood = null;
    collisionGraceElapsed = null;
  }

  function restart() {
    game = new SnakeGame({ cols: COLS, rows: ROWS });
    resetMotion();
    lastTime = performance.now();
    pauseButton.textContent = 'Пауза';
    hideOverlay();
    updateScore();
    draw();
  }

  function togglePause() {
    if (game.gameOver) return;
    const paused = game.togglePause();
    pauseButton.textContent = paused ? 'Продолжить' : 'Пауза';
    if (paused) showPauseOverlay();
    else hideOverlay();
  }

  function setDirection(name) {
    const directions = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const direction = directions[name];
    if (!direction) return;

    if (collisionGraceElapsed !== null && !segment) {
      const redirected = game.overrideNextDirection(...direction);
      if (redirected) collisionGraceElapsed = null;
      return;
    }
    game.setDirection(...direction);
  }

  function handleKey(event) {
    const key = event.key.toLowerCase();
    const directionKeys = {
      arrowup: 'up', w: 'up',
      arrowdown: 'down', s: 'down',
      arrowleft: 'left', a: 'left',
      arrowright: 'right', d: 'right',
    };

    if (directionKeys[key]) {
      event.preventDefault();
      setDirection(directionKeys[key]);
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      togglePause();
    } else if (key === 'enter' || key === 'r') {
      event.preventDefault();
      restart();
    }
  }

  function showPauseOverlay() {
    overlayKicker.textContent = 'ПАУЗА';
    overlayTitle.textContent = 'Игра приостановлена';
    overlayText.textContent = 'Нажмите пробел или кнопку ниже, чтобы продолжить.';
    overlayButton.textContent = 'Продолжить';
    overlayButton.dataset.action = 'resume';
    overlay.classList.remove('hidden');
  }

  function showGameOverOverlay() {
    overlayKicker.textContent = 'ИГРА ОКОНЧЕНА';
    overlayTitle.textContent = `Счёт: ${game.score}`;
    overlayText.textContent = highScore === game.score && game.score > 0
      ? 'Новый рекорд. Начните ещё одну партию.'
      : 'Нажмите Enter, R или кнопку ниже, чтобы сыграть снова.';
    overlayButton.textContent = 'Играть снова';
    overlayButton.dataset.action = 'restart';
    overlay.classList.remove('hidden');
  }

  function showVictoryOverlay() {
    overlayKicker.textContent = 'ПОБЕДА';
    overlayTitle.textContent = 'Поле полностью заполнено!';
    overlayText.textContent = `Финальный счёт: ${game.score}. Вы заняли змейкой все ${COLS * ROWS} клеток.`;
    overlayButton.textContent = 'Сыграть ещё раз';
    overlayButton.dataset.action = 'restart';
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x += 1) {
      ctx.moveTo(x * cellW + 0.5, 0);
      ctx.lineTo(x * cellW + 0.5, canvas.height);
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.moveTo(0, y * cellH + 0.5);
      ctx.lineTo(canvas.width, y * cellH + 0.5);
    }
    ctx.stroke();
  }

  function drawFood() {
    const food = transitionFood || game.food;
    if (!food) return;
    const cx = food.x * cellW + cellW / 2;
    const cy = food.y * cellH + cellH / 2;
    const radius = Math.min(cellW, cellH) * 0.28;

    ctx.save();
    ctx.shadowColor = 'rgba(255,93,115,0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function gridToPixel(point) {
    return {
      x: point.x * cellW + cellW / 2,
      y: point.y * cellH + cellH / 2,
    };
  }

  function fillPolygon(points, color, shadow = null) {
    if (points.length < 3) return;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBodyHighlight(centerline) {
    if (centerline.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(239,255,202,0.25)';
    ctx.lineWidth = Math.max(1.5, Math.min(cellW, cellH) * 0.075);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(centerline[0].x, centerline[0].y);
    for (let index = 1; index < centerline.length; index += 1) {
      ctx.lineTo(centerline[index].x, centerline[index].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function localPoint(center, direction, forward, side) {
    return {
      x: center.x + direction.x * forward - direction.y * side,
      y: center.y + direction.y * forward + direction.x * side,
    };
  }

  function traceHeadShape(center, direction, unit, scale = 1) {
    const point = (forward, side) => localPoint(center, direction, forward * unit * scale, side * unit * scale);
    const neckTop = point(-0.31, -0.17);
    const topControl1 = point(-0.12, -0.27);
    const topControl2 = point(0.18, -0.30);
    const tip = point(0.40, 0);
    const bottomControl1 = point(0.18, 0.30);
    const bottomControl2 = point(-0.12, 0.27);
    const neckBottom = point(-0.31, 0.17);
    const neckCurve1 = point(-0.38, 0.10);
    const neckCurve2 = point(-0.38, -0.10);

    ctx.beginPath();
    ctx.moveTo(neckTop.x, neckTop.y);
    ctx.bezierCurveTo(topControl1.x, topControl1.y, topControl2.x, topControl2.y, tip.x, tip.y);
    ctx.bezierCurveTo(bottomControl1.x, bottomControl1.y, bottomControl2.x, bottomControl2.y, neckBottom.x, neckBottom.y);
    ctx.bezierCurveTo(neckCurve1.x, neckCurve1.y, neckCurve2.x, neckCurve2.y, neckTop.x, neckTop.y);
    ctx.closePath();
  }

  function drawHead(position, direction) {
    const center = gridToPixel(position);
    const unit = Math.min(cellW, cellH);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.48)';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#142015';
    traceHeadShape(center, direction, unit, 1.10);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#b9ff3f';
    traceHeadShape(center, direction, unit, 1);
    ctx.fill();

    const eyeForward = unit * 0.075;
    const eyeSide = unit * 0.155;
    const eyeRadius = unit * 0.042;
    ctx.fillStyle = '#071009';
    for (const side of [-1, 1]) {
      const eye = localPoint(center, direction, eyeForward, eyeSide * side);
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const nostrilForward = unit * 0.285;
    const nostrilSide = unit * 0.07;
    ctx.fillStyle = '#31510f';
    for (const side of [-1, 1]) {
      const nostril = localPoint(center, direction, nostrilForward, nostrilSide * side);
      ctx.beginPath();
      ctx.arc(nostril.x, nostril.y, unit * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }

    const tongueBase = localPoint(center, direction, unit * 0.39, 0);
    const tongueFork = localPoint(center, direction, unit * 0.58, 0);
    const tongueLeft = localPoint(center, direction, unit * 0.66, -unit * 0.055);
    const tongueRight = localPoint(center, direction, unit * 0.66, unit * 0.055);
    ctx.save();
    ctx.strokeStyle = '#ff6b78';
    ctx.lineWidth = Math.max(1.2, unit * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tongueBase.x, tongueBase.y);
    ctx.lineTo(tongueFork.x, tongueFork.y);
    ctx.lineTo(tongueLeft.x, tongueLeft.y);
    ctx.moveTo(tongueFork.x, tongueFork.y);
    ctx.lineTo(tongueRight.x, tongueRight.y);
    ctx.stroke();
    ctx.restore();
  }

  function bodyDistance() {
    let distance = Math.max(0, game.snake.length - 1);
    if (segment && segment.result.ate) {
      const progress = Math.min(1, segment.elapsed / CELL_TRAVEL_MS);
      distance -= (1 - progress);
    }
    return Math.max(0, distance);
  }

  function drawSnake() {
    const path = sampleTrail(trail, bodyDistance(), TRAIL_SAMPLE_SPACING);
    if (path.length === 0) return;
    const centers = path.map(gridToPixel);
    const centerline = buildSmoothCenterline(centers, 2);
    const baseWidth = Math.min(cellW, cellH) * 0.58;
    const outline = buildRibbonPolygon(centerline, baseWidth, 7);
    const body = buildRibbonPolygon(centerline, baseWidth, 0);

    fillPolygon(outline, '#142015', { color: 'rgba(0,0,0,0.48)', blur: 8 });
    fillPolygon(body, '#8dde1e');
    drawBodyHighlight(centerline);
    drawHead(headPosition, game.direction);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#08100c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawFood();
    drawSnake();
  }

  function startSegment() {
    const foodBeforeStep = game.food ? { ...game.food } : null;
    const from = { ...headPosition };
    const result = game.step();
    const to = result.moved ? { ...game.snake[0] } : from;
    if (!result.moved) return result;

    segment = { from, to, elapsed: 0, result, foodBeforeStep };
    if (result.ate) transitionFood = foodBeforeStep;
    return result;
  }

  function finishSegment() {
    if (!segment) return;
    headPosition = { ...segment.to };
    trail = appendTrailPoint(trail, headPosition, TRAIL_MEMORY);
    const result = segment.result;
    segment = null;

    if (result.ate) {
      transitionFood = null;
      updateScore();
    }
    if (result.gameOver && result.won) {
      collisionGraceElapsed = null;
      showVictoryOverlay();
    }
  }

  function advanceSimulation(deltaMs) {
    let remaining = Math.max(0, deltaMs);
    let guard = 0;

    while (remaining > 1e-9 && guard < 16) {
      guard += 1;

      if (segment) {
        const advanced = advanceSegment(segment, remaining, CELL_TRAVEL_MS);
        segment = advanced.segment;
        headPosition = advanced.position;
        trail = appendTrailPoint(trail, headPosition, TRAIL_MEMORY);
        remaining = advanced.remaining;
        if (advanced.finished) {
          finishSegment();
          continue;
        }
        break;
      }

      if (game.gameOver) break;

      const preview = game.previewNextStep();
      if (preview.collides) {
        if (collisionGraceElapsed === null) collisionGraceElapsed = 0;
        const graceLeft = Math.max(0, COLLISION_GRACE_MS - collisionGraceElapsed);
        const consumed = Math.min(remaining, graceLeft);
        collisionGraceElapsed += consumed;
        remaining -= consumed;

        if (collisionGraceElapsed < COLLISION_GRACE_MS) break;

        collisionGraceElapsed = null;
        const result = game.step();
        updateScore();
        if (result.gameOver && !result.won) showGameOverOverlay();
        break;
      }

      collisionGraceElapsed = null;
      startSegment();
    }
  }

  function frame(now) {
    const delta = Math.min(Math.max(0, now - lastTime), 250);
    lastTime = now;

    if (!game.paused && (!game.gameOver || segment)) {
      advanceSimulation(delta);
    }

    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener('keydown', handleKey);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restart);
  overlayButton.addEventListener('click', () => {
    if (overlayButton.dataset.action === 'restart') restart();
    else togglePause();
  });

  controls.forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      setDirection(button.dataset.dir);
    });
  });

  canvas.addEventListener('pointerdown', event => {
    touchStart = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'right' : 'left');
    else setDirection(dy > 0 ? 'down' : 'up');
  });

  updateScore();
  draw();
  requestAnimationFrame(frame);
})();
