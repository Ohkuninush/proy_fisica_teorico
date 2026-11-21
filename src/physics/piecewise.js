import { G, physicsSegments } from './track.js';

const EPS_T = 1e-9;
const EPS_V = 1e-9;
const MAX_EVENTS = 200000;

function firstHit(d0, v, a, target) {
  const c = d0 - target;
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(v) < 1e-12) return null;
    const tau = -c / v;
    return tau > EPS_T ? tau : null;
  }
  const disc = v * v - 2 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const roots = [(-v - sq) / a, (-v + sq) / a].filter((tau) => tau > EPS_T).sort((x, y) => x - y);
  return roots.length ? roots[0] : null;
}

export function createPiecewiseMotion(params) {
  const motor = params.model === 'MRU' ? 0 : params.a;
  const segments = physicsSegments(params);
  const bounds = segments.length ? [segments[0].d0, ...segments.map((seg) => seg.d1)] : [];
  const zoneTheta = [0, ...segments.map((seg) => seg.theta), ...(segments.length ? [0] : [])];
  const zoneAccel = zoneTheta.map((theta) => motor - G * Math.sin(theta));

  const zoneOf = (d) => {
    let k = 0;
    while (k < bounds.length && d >= bounds[k]) k++;
    return k;
  };

  function resolveZone(d, v) {
    const k = zoneOf(d);
    const onBound = (i) => i >= 0 && i < bounds.length && Math.abs(d - bounds[i]) < 1e-7;
    const lower = onBound(k - 1) ? k - 1 : onBound(k) ? k : null;
    if (lower === null) return { zone: k, stuck: false };
    const below = lower;
    const above = lower + 1;
    if (v > EPS_V) return { zone: above, stuck: false };
    if (v < -EPS_V) return { zone: below, stuck: false };
    if (zoneAccel[above] > 0) return { zone: above, stuck: false };
    if (zoneAccel[below] < 0) return { zone: below, stuck: false };
    return { zone: above, stuck: true };
  }

  function simulate(horizon, target) {
    const pieces = [];
    let t = 0;
    let d = 0;
    let v = params.v0;
    let hit = null;
    let maxD = 0;
    for (let n = 0; n < MAX_EVENTS && t < horizon - EPS_T; n++) {
      const { zone, stuck } = resolveZone(d, v);
      const a = stuck ? 0 : zoneAccel[zone];
      const theta = zoneTheta[zone];
      const remaining = horizon - t;
      const candidates = [{ tau: remaining, kind: 'end' }];
      if (!stuck) {
        if (zone > 0) {
          const tau = firstHit(d, v, a, bounds[zone - 1]);
          if (tau !== null) candidates.push({ tau, kind: 'bound' });
        }
        if (zone < bounds.length) {
          const tau = firstHit(d, v, a, bounds[zone]);
          if (tau !== null) candidates.push({ tau, kind: 'bound' });
        }
        if (target !== null) {
          const tau = firstHit(d, v, a, target);
          if (tau !== null) candidates.push({ tau, kind: 'hit' });
        }
      }
      const next = candidates.reduce((best, c) => (c.tau < best.tau || (c.tau === best.tau && c.kind === 'hit') ? c : best));
      const tau = Math.min(next.tau, remaining);
      pieces.push({ t0: t, t1: t + tau, d0: d, v0: v, a, theta });
      if (a < 0 && v > 0) {
        const tVertex = v / -a;
        maxD = Math.max(maxD, d + (tVertex <= tau ? (v * v) / (-2 * a) : v * tau + 0.5 * a * tau * tau));
      }
      d += v * tau + 0.5 * a * tau * tau;
      v += a * tau;
      t += tau;
      maxD = Math.max(maxD, d);
      if (next.kind === 'bound') {
        const k = zone > 0 && Math.abs(d - bounds[zone - 1]) < 1e-6 ? zone - 1 : zone;
        if (k < bounds.length && Math.abs(d - bounds[k]) < 1e-6) d = bounds[k];
      }
      if (next.kind === 'hit' && next.tau <= remaining) {
        d = target;
        hit = { t, v };
        break;
      }
    }
    return { pieces, hit, maxD, end: { t, d, v } };
  }

  function stateIn(pieces, t) {
    let lo = 0;
    let hi = pieces.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (pieces[mid].t0 <= t) lo = mid;
      else hi = mid - 1;
    }
    const p = pieces[lo];
    const tau = Math.max(0, Math.min(t, p.t1) - p.t0);
    return { d: p.d0 + p.v0 * tau + 0.5 * p.a * tau * tau, v: p.v0 + p.a * tau, a: p.a, theta: p.theta };
  }

  return { simulate, stateIn, motorAcceleration: motor };
}
