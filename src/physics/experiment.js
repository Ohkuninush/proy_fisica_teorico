import { maxCarX, obstacleX } from './collision.js';
import { CAR_LENGTH, validateParams } from './params.js';
import { createPiecewiseMotion } from './piecewise.js';
import { createProjectileExperiment, PROJECTILE } from './projectile.js';
import { createTrack } from './track.js';

const RAD_TO_DEG = 180 / Math.PI;

export function createExperiment(input) {
  const { ok, errors, params } = validateParams(input);
  if (!ok) throw new Error(`Invalid parameters: ${errors.join('; ')}`);
  if (params.model === PROJECTILE) return createProjectileExperiment(params);

  const track = createTrack(params);
  const motion = createPiecewiseMotion(params);
  const run = motion.simulate(params.duration, params.gap);
  const collides = run.hit !== null;
  const tEnd = collides ? run.hit.t : params.duration;
  const obstacle = obstacleX(params);
  const vPeak = Math.max(...run.pieces.flatMap((p) => [Math.abs(p.v0), Math.abs(p.v0 + p.a * (p.t1 - p.t0))]), Math.abs(params.v0));

  function evaluate(t) {
    const tc = Math.min(Math.max(t, 0), tEnd);
    const s = motion.stateIn(run.pieces, tc);
    const collided = collides && tc >= tEnd;
    const x = collided ? maxCarX(params) : params.x0 + s.d;
    const center = track.pointAt(x - params.x0 - CAR_LENGTH / 2);
    return { t: tc, x, v: s.v, a: s.a, h: center.h, slope: s.theta * RAD_TO_DEG, collided, finished: tc >= tEnd };
  }

  const progress = (s) => {
    const traveled = s.x - params.x0;
    return { traveled, remaining: Math.max(0, params.gap - traveled) };
  };

  return { params, tEnd, impactTime: collides ? tEnd : null, obstacleX: obstacle, vPeak, track, evaluate, progress };
}
