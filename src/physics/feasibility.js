import { impactTime } from './collision.js';

export const REASON = Object.freeze({
  OK: 'ok',
  STATIONARY: 'stationary',
  MOVING_AWAY: 'moving-away',
  STOPS_SHORT: 'stops-short',
  STOPS_AT_OBSTACLE: 'stops-at-obstacle',
  DURATION_TOO_SHORT: 'duration-too-short',
});

const EPS = 1e-9;

export function analyzeFeasibility(params) {
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
