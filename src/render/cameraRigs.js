// Camera viewpoints. A rig turns the current simulation state into a camera pose.
// Presentation only: reads positions, never writes physics.
// fx = how much of the "FOV kick" effect applies; streaks = whether wind streaks make sense here;
// beams = headlight cones (they would blind cameras that sit in or face the light).
import * as THREE from 'three';
import { LANE_Z } from './environment.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

/** ctx: { carX, cx (car centre), obstacleX, snap, time, eye: [x, y] } */
export const RIGS = {
  side: {
    fx: 1,
    streaks: true,
    pose: (c) => ({ pos: v(c.cx + 3.5, 3.4, 19), look: v(c.cx + 3.5, 1.3, LANE_Z * 0.6), fov: 38, up: UP }),
  },
  cinematic: {
    fx: 0.4,
    streaks: true,
    pose: (c) => {
      if (c.snap.impact) {
        // after the hit: hold a wide shot of the impact from the roadside
        return { pos: v(c.obstacleX - 9, 1.4, 12), look: v(c.obstacleX - 1.5, 1.7, LANE_Z), fov: 34, up: UP };
      }
      const t = c.time;
      return {
        pos: v(c.cx - 7 + 2.5 * Math.sin(t * 0.3), 0.95 + 0.3 * Math.sin(t * 0.55), 9 + 2 * Math.cos(t * 0.25)),
        look: v(c.cx + 5, 1.3, LANE_Z),
        fov: 32,
        up: UP,
      };
    },
  },
  aerial: {
    fx: 0.2,
    streaks: false,
    pose: (c) => ({ pos: v(c.cx + 6, 24, 17), look: v(c.cx + 6, 0, LANE_Z - 1), fov: 42, up: UP }),
  },
  top: {
    fx: 0,
    streaks: false,
    pose: (c) => ({ pos: v(c.cx + 5, 30, LANE_Z), look: v(c.cx + 5, 0, LANE_Z), fov: 45, up: v(0, 0, -1) }),
  },
  chase: {
    fx: 1,
    streaks: true,
    pose: (c) => ({ pos: v(c.carX - 8.5, 3.0, LANE_Z + 0.6), look: v(c.carX + 22, 1.3, LANE_Z), fov: 52, up: UP }),
  },
  driver: {
    fx: 1,
    streaks: true,
    beams: false,
    pose: (c) => {
      const [ex, ey] = c.eye;
      return { pos: v(c.carX + ex, ey, LANE_Z), look: v(c.carX + ex + 30, ey - 0.2, LANE_Z), fov: 68, up: UP };
    },
  },
  zoom: {
    fx: 0,
    streaks: false,
    beams: false,
    pose: (c) => {
      // telephoto from beside the obstacle: the zoom keeps the car a similar size as it closes in
      const dist = Math.max(c.obstacleX - c.carX, 1);
      const fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(6 / dist)), 9, 60);
      return { pos: v(c.obstacleX - 1.2, 1.3, LANE_Z + 3.4), look: v(c.carX + 2.1, 1.1, LANE_Z), fov, up: UP };
    },
  },
};

export const DEFAULT_VIEW = 'side';

const smooth = (t) => t * t * (3 - 2 * t);

/** Blend two poses (t in 0..1) so switching views glides instead of cutting. */
export function blendPose(a, b, t) {
  const k = smooth(clamp(t, 0, 1));
  return {
    pos: a.pos.clone().lerp(b.pos, k),
    look: a.look.clone().lerp(b.look, k),
    fov: a.fov + (b.fov - a.fov) * k,
    up: a.up.clone().lerp(b.up, k).normalize(),
  };
}
