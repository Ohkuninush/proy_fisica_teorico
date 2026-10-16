// Will the experiment actually end in an impact? Pure check on validated params, used before starting.
import { impactTime } from './collision.js';

export const REASON = Object.freeze({
  OK: 'ok',
  STATIONARY: 'stationary', // v0 = 0 and a = 0
  MOVING_AWAY: 'moving-away', // position never increases toward the obstacle
  STOPS_SHORT: 'stops-short', // braking stops before reaching it
  STOPS_AT_OBSTACLE: 'stops-at-obstacle', // arrives with zero speed: touches, no impact
  DURATION_TOO_SHORT: 'duration-too-short', // would arrive, but after the experiment ends
});

const EPS = 1e-9;

/**
 * @returns {{ ok: boolean, reason: string, tImpact: number|null, vImpact: number|null,
 *             stopDistance: number|null, minDuration: number|null }}
 */
export function analyzeFeasibility(params) {
  const { v0, gap, duration } = params;
  const a = params.model === 'MRU' ? 0 : params.a;
  const out = (reason, extra = {}) => ({ ok: reason === REASON.OK, reason, tImpact: null, vImpact: null, stopDistance: null, minDuration: null, ...extra });

  const t = impactTime(params);
  if (t === null) {
    if (v0 === 0 && a === 0) return out(REASON.STATIONARY);
    if (v0 <= 0 && a <= 0) return out(REASON.MOVING_AWAY);
    // v0 > 0 and a < 0: stops before reaching the obstacle
    return out(REASON.STOPS_SHORT, { stopDistance: (v0 * v0) / (2 * -a) });
  }
  const vImpact = v0 + a * t;
  if (vImpact <= EPS) return out(REASON.STOPS_AT_OBSTACLE, { tImpact: t, vImpact: 0, stopDistance: gap });
  if (t > duration) return out(REASON.DURATION_TOO_SHORT, { tImpact: t, vImpact, minDuration: t });
  return out(REASON.OK, { tImpact: t, vImpact });
}
