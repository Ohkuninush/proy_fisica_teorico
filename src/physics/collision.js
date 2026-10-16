// Collision against a fixed obstacle. x is the car's rear reference; the front is x + carLength.
import { CAR_LENGTH } from './params.js';

export const obstacleX = (params, carLength = CAR_LENGTH) => params.x0 + carLength + params.gap;

/** Largest rear position x the car can have before its front touches the obstacle. */
export const maxCarX = (params, carLength = CAR_LENGTH) => obstacleX(params, carLength) - carLength;

/**
 * Smallest t >= 0 where the car front reaches the obstacle, solving
 * 0.5*a*t^2 + v0*t - gap = 0. Returns null when it never happens
 * (ignoring the experiment duration).
 */
export function impactTime(params) {
  const { v0, gap } = params;
  const a = params.model === 'MRU' ? 0 : params.a;
  if (gap <= 0) return 0;
  if (a === 0) return v0 > 0 ? gap / v0 : null;
  const disc = v0 * v0 + 2 * a * gap;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const roots = [(-v0 - sq) / a, (-v0 + sq) / a].filter((r) => r >= 0);
  return roots.length ? Math.min(...roots) : null;
}
