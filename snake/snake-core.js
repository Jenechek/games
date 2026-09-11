(function (root) {
  class SnakeGame {
    constructor({ cols = 24, rows = 18, rng = Math.random } = {}) {
      this.cols = cols;
      this.rows = rows;
      this.rng = rng;
      this.reset();
    }

    reset() {
      const cx = Math.floor(this.cols / 2);
      const cy = Math.floor(this.rows / 2);
      this.snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ];
      this.direction = { x: 1, y: 0 };
      this.nextDirection = { x: 1, y: 0 };
      this.directionQueue = [];
      this.score = 0;
      this.gameOver = false;
      this.won = false;
      this.paused = false;
      this.food = this.spawnFood();
    }

    setDirection(x, y) {
      if (this.gameOver || this.paused) return;
      const isUnitDirection = Math.abs(x) + Math.abs(y) === 1;
      if (!isUnitDirection) return;

      const reference = this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.nextDirection;
      const reversesReference = x === -reference.x && y === -reference.y;
      const repeatsReference = x === reference.x && y === reference.y;
      if (reversesReference || repeatsReference) return;

      this.directionQueue.push({ x, y });
      this.nextDirection = { ...this.directionQueue[0] };
    }

    togglePause() {
      if (!this.gameOver) this.paused = !this.paused;
      return this.paused;
    }

    overrideNextDirection(x, y) {
      if (this.gameOver || this.paused) return false;
      const isUnitDirection = Math.abs(x) + Math.abs(y) === 1;
      if (!isUnitDirection) return false;
      const reversesCurrent = x === -this.direction.x && y === -this.direction.y;
      const repeatsCurrent = x === this.direction.x && y === this.direction.y;
      if (reversesCurrent || repeatsCurrent) return false;

      this.directionQueue = [{ x, y }];
      this.nextDirection = { x, y };
      return true;
    }

    previewNextStep() {
      const direction = this.directionQueue.length > 0
        ? this.directionQueue[0]
        : this.nextDirection;
      const head = this.snake[0];
      const nextHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
      };
      const hitWall =
        nextHead.x < 0 ||
        nextHead.y < 0 ||
        nextHead.x >= this.cols ||
        nextHead.y >= this.rows;
      const ate = Boolean(this.food && nextHead.x === this.food.x && nextHead.y === this.food.y);
      const bodyToCheck = ate ? this.snake : this.snake.slice(0, -1);
      const hitSelf = bodyToCheck.some(part => part.x === nextHead.x && part.y === nextHead.y);

      return {
        direction: { ...direction },
        nextHead,
        hitWall,
        hitSelf,
        collides: hitWall || hitSelf,
        ate,
      };
    }

    step() {
      if (this.gameOver || this.paused) return { moved: false, ate: false, gameOver: this.gameOver, won: this.won };

      const preview = this.previewNextStep();
      if (this.directionQueue.length > 0) {
        this.direction = this.directionQueue.shift();
      } else {
        this.direction = { ...this.nextDirection };
      }
      this.nextDirection = this.directionQueue.length > 0
        ? { ...this.directionQueue[0] }
        : { ...this.direction };
      const { nextHead, hitWall, hitSelf, ate } = preview;

      if (hitWall || hitSelf) {
        this.gameOver = true;
        this.won = false;
        return { moved: false, ate: false, gameOver: true, won: false };
      }

      this.snake.unshift(nextHead);

      if (ate) {
        this.score += 10;
        this.food = this.spawnFood();
        if (!this.food) {
          this.gameOver = true;
          this.won = true;
        }
      } else {
        this.snake.pop();
      }

      return { moved: true, ate, gameOver: this.gameOver, won: this.won };
    }

    spawnFood() {
      const occupied = new Set(this.snake.map(part => `${part.x},${part.y}`));
      const empty = [];

      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
        }
      }

      if (empty.length === 0) return null;
      const index = Math.min(empty.length - 1, Math.floor(this.rng() * empty.length));
      return empty[index];
    }
  }

  root.SnakeGame = SnakeGame;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SnakeGame };
  }
})(typeof window !== 'undefined' ? window : globalThis);
