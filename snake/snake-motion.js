(function (root) {
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function advanceSegment(segment, deltaMs, durationMs) {
    const duration = Math.max(1e-9, durationMs);
    const remainingDuration = Math.max(0, duration - segment.elapsed);
    const consumed = Math.min(Math.max(0, deltaMs), remainingDuration);
    const elapsed = segment.elapsed + consumed;
    const t = Math.min(1, elapsed / duration);
    const position = {
      x: lerp(segment.from.x, segment.to.x, t),
      y: lerp(segment.from.y, segment.to.y, t),
    };

    return {
      segment: { ...segment, elapsed },
      position,
      consumed,
      remaining: Math.max(0, deltaMs - consumed),
      finished: t >= 1,
      progress: t,
    };
  }

  function appendTrailPoint(trail, point, maxDistance = Infinity) {
    const next = Array.isArray(trail) ? trail.map(p => ({ ...p })) : [];
    const last = next[next.length - 1];
    if (!last || distance(last, point) > 1e-9) next.push({ ...point });
    if (!Number.isFinite(maxDistance) || maxDistance <= 0 || next.length < 2) return next;

    let total = 0;
    for (let index = next.length - 1; index > 0; index -= 1) {
      const seg = distance(next[index - 1], next[index]);
      if (total + seg <= maxDistance + 1e-9) {
        total += seg;
        continue;
      }

      const keep = Math.max(0, maxDistance - total);
      const newer = next[index];
      const older = next[index - 1];
      const ratio = seg <= 1e-9 ? 0 : keep / seg;
      const clipped = {
        x: newer.x + (older.x - newer.x) * ratio,
        y: newer.y + (older.y - newer.y) * ratio,
      };
      return [clipped, ...next.slice(index)];
    }
    return next;
  }

  function pointAtDistanceFromHead(trail, targetDistance) {
    if (!Array.isArray(trail) || trail.length === 0) return null;
    const head = trail[trail.length - 1];
    if (targetDistance <= 0) return { ...head };

    let walked = 0;
    for (let index = trail.length - 1; index > 0; index -= 1) {
      const newer = trail[index];
      const older = trail[index - 1];
      const seg = distance(older, newer);
      if (walked + seg >= targetDistance - 1e-9) {
        const remaining = Math.max(0, targetDistance - walked);
        const ratio = seg <= 1e-9 ? 0 : remaining / seg;
        return {
          x: newer.x + (older.x - newer.x) * ratio,
          y: newer.y + (older.y - newer.y) * ratio,
        };
      }
      walked += seg;
    }
    return { ...trail[0] };
  }

  function sampleTrail(trail, bodyDistance, spacing = 0.1) {
    if (!Array.isArray(trail) || trail.length === 0) return [];
    const target = Math.max(0, bodyDistance);
    const gap = Math.max(0.02, spacing);
    const targets = [];
    for (let d = 0; d < target - 1e-9; d += gap) targets.push(d);
    targets.push(target);

    const points = [];
    let index = trail.length - 1;
    let walked = 0;
    let newer = trail[index];
    let older = index > 0 ? trail[index - 1] : newer;
    let seg = distance(older, newer);

    for (const d of targets) {
      while (index > 0 && walked + seg < d - 1e-9) {
        walked += seg;
        index -= 1;
        newer = trail[index];
        older = index > 0 ? trail[index - 1] : newer;
        seg = distance(older, newer);
      }

      if (index === 0 || seg <= 1e-9) {
        points.push({ ...trail[0] });
        continue;
      }

      const ratio = Math.max(0, Math.min(1, (d - walked) / seg));
      points.push({
        x: newer.x + (older.x - newer.x) * ratio,
        y: newer.y + (older.y - newer.y) * ratio,
      });
    }
    return points;
  }

  const api = { advanceSegment, appendTrailPoint, sampleTrail, pointAtDistanceFromHead };
  root.SnakeMotion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
