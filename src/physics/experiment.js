import { stateAt } from './motion.js';
import { impactTime, obstacleX, maxCarX } from './collision.js';
import { validateParams } from './params.js';

export function createExperiment(input) {
  const { ok, errors, params } = validateParams(input);
  if (!ok) throw new Error(`Invalid parameters: ${errors.join('; ')}`);

  const tHit = impactTime(params);
  const collides = tHit !== null && tHit <= params.duration;
  const tEnd = collides ? tHit : params.duration;
  const obstacle = obstacleX(params);

  function evaluate(t) {
    const tc = Math.min(Math.max(t, 0), tEnd);
    const s = stateAt(params, tc);
    const collided = collides && tc >= tHit;
    if (collided) s.x = maxCarX(params);
    return { ...s, collided, finished: tc >= tEnd };
  }

  return { params, tEnd, impactTime: collides ? tHit : null, obstacleX: obstacle, evaluate };
}
