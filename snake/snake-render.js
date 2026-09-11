(function (root) {
  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function interpolateSnake(previous, current, alpha) {
    const t = clamp01(alpha);
    if (!Array.isArray(current) || current.length === 0) return [];
    if (!Array.isArray(previous) || previous.length === 0) {
      return current.map(part => ({ ...part }));
    }

    return current.map((part, index) => {
      const from = previous[Math.min(index, previous.length - 1)] || part;
      return {
        x: from.x + (part.x - from.x) * t,
        y: from.y + (part.y - from.y) * t,
      };
    });
  }

  function getBodyWidthScale(index, length) {
    if (length <= 1) return 1;
    if (index === 0) return 1.14;
    const tailIndex = length - 1;
    const distanceFromTail = tailIndex - index;
    if (length <= 3) {
      const t = index / tailIndex;
      return 1 - (0.72 * t);
    }
    if (distanceFromTail === 0) return 0.28;
    if (distanceFromTail === 1) return 0.56;
    if (distanceFromTail === 2) return 0.78;
    return 1;
  }

  function getTailDirection(snake) {
    if (!Array.isArray(snake) || snake.length < 2) return { x: 0, y: 0 };
    const tail = snake[snake.length - 1];
    const beforeTail = snake[snake.length - 2];
    const dx = beforeTail.x - tail.x;
    const dy = beforeTail.y - tail.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  function interpolatePoint(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  function quadraticPoint(start, control, end, t) {
    const oneMinus = 1 - t;
    return {
      x: oneMinus * oneMinus * start.x + 2 * oneMinus * t * control.x + t * t * end.x,
      y: oneMinus * oneMinus * start.y + 2 * oneMinus * t * control.y + t * t * end.y,
    };
  }

  function buildSmoothCenterline(points, curveSteps = 6) {
    if (!Array.isArray(points) || points.length === 0) return [];
    if (points.length === 1) return [{ ...points[0] }];
    const steps = Math.max(2, Math.floor(curveSteps));
    const result = [{ ...points[0] }];
    let start = points[0];

    for (let index = 1; index < points.length - 1; index += 1) {
      const control = points[index];
      const next = points[index + 1];
      const end = {
        x: (control.x + next.x) / 2,
        y: (control.y + next.y) / 2,
      };
      for (let step = 1; step <= steps; step += 1) {
        result.push(quadraticPoint(start, control, end, step / steps));
      }
      start = end;
    }

    const last = points[points.length - 1];
    for (let step = 1; step <= steps; step += 1) {
      result.push(interpolatePoint(start, last, step / steps));
    }
    return result;
  }

  function buildRibbonPolygon(centerline, baseWidth, extraWidth = 0) {
    if (!Array.isArray(centerline) || centerline.length === 0) return [];
    if (centerline.length === 1) return [{ ...centerline[0] }, { ...centerline[0] }];

    const cumulative = [0];
    for (let index = 1; index < centerline.length; index += 1) {
      const dx = centerline[index].x - centerline[index - 1].x;
      const dy = centerline[index].y - centerline[index - 1].y;
      cumulative[index] = cumulative[index - 1] + Math.hypot(dx, dy);
    }
    const total = cumulative[cumulative.length - 1] || 1;
    const left = [];
    const right = [];

    for (let index = 0; index < centerline.length; index += 1) {
      const before = centerline[Math.max(0, index - 1)];
      const after = centerline[Math.min(centerline.length - 1, index + 1)];
      let dx = after.x - before.x;
      let dy = after.y - before.y;
      const tangentLength = Math.hypot(dx, dy) || 1;
      dx /= tangentLength;
      dy /= tangentLength;
      const nx = -dy;
      const ny = dx;
      const progress = cumulative[index] / total;
      const taperStart = 0.56;
      const taper = progress <= taperStart
        ? 1
        : 1 - ((progress - taperStart) / (1 - taperStart)) * 0.78;
      const width = Math.max(baseWidth * 0.22, (baseWidth + extraWidth) * taper);
      const half = width / 2;
      left.push({
        x: centerline[index].x + nx * half,
        y: centerline[index].y + ny * half,
      });
      right.push({
        x: centerline[index].x - nx * half,
        y: centerline[index].y - ny * half,
      });
    }

    return left.concat(right.reverse());
  }

  const api = {
    interpolateSnake,
    getTailDirection,
    getBodyWidthScale,
    buildSmoothCenterline,
    buildRibbonPolygon,
  };
  root.SnakeRender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
