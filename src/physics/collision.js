import { CAR_LENGTH } from './params.js';

export const obstacleX = (params, carLength = CAR_LENGTH) => params.x0 + carLength + params.gap;

export const maxCarX = (params, carLength = CAR_LENGTH) => obstacleX(params, carLength) - carLength;

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
