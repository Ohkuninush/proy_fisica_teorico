import { impactTime } from './collision.js';
import { CAR_LENGTH, LIMITS } from './params.js';
import { createPiecewiseMotion } from './piecewise.js';
import { PROJECTILE, projectileSummary } from './projectile.js';
import { createTrack, hasRamps } from './track.js';

export const REASON = Object.freeze({
  OK: 'ok',
  STATIONARY: 'stationary',
  MOVING_AWAY: 'moving-away',
  STOPS_SHORT: 'stops-short',
  STOPS_AT_OBSTACLE: 'stops-at-obstacle',
  DURATION_TOO_SHORT: 'duration-too-short',
  FAILS_RAMP: 'fails-ramp',
  NO_FLIGHT: 'no-flight',
});

const EPS = 1e-9;

const result = (reason, extra = {}) => ({ ok: reason === REASON.OK, reason, tImpact: null, vImpact: null, stopDistance: null, minDuration: null, ...extra });

// Con rampas no hay fórmula cerrada: se simula por tramos hasta el máximo de duración permitido.
function analyzeTrack(params) {
  const { v0, duration } = params;
  const motion = createPiecewiseMotion(params);
  const run = motion.simulate(LIMITS.duration[1], params.gap);
  const track = createTrack(params);
  const extra = { maxHeight: track.maxHeight };
  if (run.hit) {
    const { t, v } = run.hit;
    if (v <= EPS) return result(REASON.STOPS_AT_OBSTACLE, { ...extra, tImpact: t, vImpact: 0, stopDistance: params.gap });
    if (t > duration) return result(REASON.DURATION_TOO_SHORT, { ...extra, tImpact: t, vImpact: v, minDuration: t });
    return result(REASON.OK, { ...extra, tImpact: t, vImpact: v });
  }
  if (run.maxD <= 1e-6) {
    const a = motion.motorAcceleration;
    return result(v0 === 0 && a === 0 ? REASON.STATIONARY : REASON.MOVING_AWAY, extra);
  }
  const center = run.maxD - CAR_LENGTH / 2;
  if (track.thetaAt(center) > 0) {
    return result(REASON.FAILS_RAMP, { ...extra, stopDistance: run.maxD, reachedHeight: track.pointAt(center).h });
  }
  return result(REASON.STOPS_SHORT, { ...extra, stopDistance: run.maxD });
}

function analyzeProjectile(params) {
  const summary = projectileSummary(params);
  if (summary.tFlight <= 1e-9) return result(REASON.NO_FLIGHT, { summary });
  return result(REASON.OK, { tImpact: summary.tFlight, vImpact: summary.vImpact, summary });
}

export function analyzeFeasibility(params) {
  if (params.model === PROJECTILE) return analyzeProjectile(params);
  if (hasRamps(params)) return analyzeTrack(params);
  const { v0, gap, duration } = params;
  const a = params.model === 'MRU' ? 0 : params.a;
  const out = (reason, extra = {}) => ({ ok: reason === REASON.OK, reason, tImpact: null, vImpact: null, stopDistance: null, minDuration: null, ...extra });

  const t = impactTime(params);
  if (t === null) {
    if (v0 === 0 && a === 0) return out(REASON.STATIONARY);
    if (v0 <= 0 && a <= 0) return out(REASON.MOVING_AWAY);
    return out(REASON.STOPS_SHORT, { stopDistance: (v0 * v0) / (2 * -a) });
  }
  const vImpact = v0 + a * t;
  if (vImpact <= EPS) return out(REASON.STOPS_AT_OBSTACLE, { tImpact: t, vImpact: 0, stopDistance: gap });
  if (t > duration) return out(REASON.DURATION_TOO_SHORT, { tImpact: t, vImpact, minDuration: t });
  return out(REASON.OK, { tImpact: t, vImpact });
}
